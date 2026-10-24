"""Bounded AI demonstration. All source reads retain caller authorization."""
import hashlib
import json
import math
from typing import Literal
from uuid import UUID

import httpx
import jwt
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.ai import AIService, EntityRequest, Failure, TranslationOutput, validate_language

VERSION = 'samvad-demo-v1'
CODES = {'en': 'en-IN', 'hi': 'hi-IN', 'ml': 'ml-IN'}


class SubmitRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    entity_type: Literal['post', 'reply']
    request_id: UUID
    body: str = Field(min_length=1, max_length=2000)
    language: Literal['en', 'hi', 'ml']
    conversation_id: UUID | None = None
    parent_reply_id: UUID | None = None

    @model_validator(mode='after')
    def valid_root(self):
        if not self.body.strip():
            raise ValueError('Text is required')
        if self.entity_type == 'reply' and not self.conversation_id:
            raise ValueError('Reply conversation required')
        if self.entity_type == 'post' and (self.conversation_id or self.parent_reply_id):
            raise ValueError('Posts do not accept reply context')
        return self


class DemoSummaryRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    entity_type: Literal['post', 'news']
    entity_id: UUID
    target_language: Literal['en', 'hi', 'ml']


class DemoSummaryOutput(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    lines: list[str] = Field(default_factory=list, max_length=5)
    insufficient_source: bool

    @model_validator(mode='after')
    def grounded_shape(self):
        if self.insufficient_source:
            if self.lines:
                raise ValueError('Insufficient source has no invented lines')
        elif not 4 <= len(self.lines) <= 5:
            raise ValueError('Four or five lines required')
        if any(not s.strip() or '\n' in s or '\r' in s or len(s) > 300 for s in self.lines):
            raise ValueError('Invalid summary line')
        return self


class ReviewRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    entity_type: Literal['post', 'reply']
    entity_id: UUID
    request_id: UUID
    action: Literal['approve', 'reject']
    reason: str = Field(min_length=1, max_length=500)
    source_hash: str = Field(pattern='^[a-f0-9]{64}$')
    expected_state: Literal['pending', 'flagged', 'blocked']

    @field_validator('reason')
    @classmethod
    def nonblank_reason(cls, value):
        if not value.strip():
            raise ValueError('Review reason required')
        return value


def chunks(text: str, limit: int = 2000) -> list[str]:
    """Bounded Python Unicode code points; no dropped whitespace or suffix."""
    output = []
    while text:
        end = min(limit, len(text))
        if end < len(text):
            split = max(text.rfind('\n', 0, end), text.rfind('. ', 0, end),
                        text.rfind('।', 0, end), text.rfind(' ', 0, end))
            if split >= end // 2:
                end = split + 1
        output.append(text[:end])
        text = text[end:]
    return output


class DemoAIService(AIService):
    async def authenticate(self, request):
        # Explicit local-only compatibility: Auth itself verifies local legacy JWTs.
        if not self.config.local_demo_mode:
            return await super().authenticate(request)
        header = request.headers.get('authorization', '')
        if not header.startswith('Bearer ') or len(header) > 10000:
            raise Failure(401, 'unauthenticated', 'Sign in to continue.')
        token = header[7:]
        try:
            claims = jwt.decode(token, options={'verify_signature': False})
            if claims.get('role') != 'authenticated':
                raise ValueError()
            response = await self.http.get(self.config.supabase_url + '/auth/v1/user',
                headers={'apikey': self.config.supabase_public_key.get_secret_value(),
                         'Authorization': header})
            if response.status_code in {401, 403}:
                raise Failure(401, 'unauthenticated', 'Sign in again.')
            response.raise_for_status()
            actor = str(UUID(response.json()['id']))
            return actor, token  # Actor comes from server validation, not decoded claims.
        except Failure:
            raise
        except (jwt.PyJWTError, ValueError, KeyError, TypeError):
            raise Failure(401, 'unauthenticated', 'Sign in again.') from None
        except httpx.HTTPError:
            raise Failure(503, 'auth_unavailable', 'Authentication is temporarily unavailable.') from None

    async def rpc(self, name, payload, token=None):
        key = (self.config.supabase_public_key if token else
               self.config.supabase_service_role_key).get_secret_value()
        try:
            r = await self.http.post(self.config.supabase_url + '/rest/v1/rpc/' + name,
                headers={'apikey': key, 'Authorization': 'Bearer ' + (token or key)}, json=payload)
            if r.status_code >= 400:
                status = r.status_code if r.status_code in {400, 401, 403, 404, 409, 429} else 503
                raise Failure(status, 'operation_unavailable',
                              'Operation not confirmed. Keep the same request ID and retry.')
            return r.json()
        except (httpx.HTTPError, ValueError):
            raise Failure() from None

    def cache_key(self, task, text, language, model, entity=''):
        return hashlib.sha256(json.dumps([VERSION, task, entity, text, language, model],
                                        ensure_ascii=False).encode()).hexdigest()

    async def translate_text(self, text, source, target, actor, entity):
        if source == target:
            return text, False
        c = self.config
        cache = self.cache_key('sarvam-translation', text, f'{source}:{target}', c.sarvam_model, entity)
        existing = await self.control('cache_get', {'key': cache})
        if existing:
            try:
                output = TranslationOutput.model_validate(existing).translated_text
            except ValueError:
                raise Failure() from None
            validate_language(output, target, text)
            return output, True
        if (not c.ai_enabled or not c.ai_data_policy_confirmed or not c.sarvam_account_use_authorized
                or not c.sarvam_api_key.get_secret_value()):
            raise Failure(503, 'translation_unavailable', 'Translation is unavailable. Original remains readable.')
        if not text or len(text) > 6000:
            raise Failure(400, 'invalid_request', 'Text is too long for this demonstration.')
        parts = chunks(text)
        # Reserve the entire input before any call; failures stay charged. Ceiling
        # uses a conservative INR 3/1000 chars and the explicitly permitted cap.
        cap = min(c.sarvam_max_characters,
                  math.floor(c.sarvam_max_credit_inr * 1000 / 3)) - c.sarvam_prior_characters
        await self.rpc('demo_ai_control', {'p_action': 'reserve_translation', 'p_payload': {
            'actor': actor, 'characters': len(text), 'cap': max(cap, 0), 'requests': len(parts)}})
        outputs = []
        try:
            for part in parts:
                r = await self.http.post('https://api.sarvam.ai/translate',
                    headers={'api-subscription-key': c.sarvam_api_key.get_secret_value()},
                    json={'input': part, 'source_language_code': CODES[source],
                          'target_language_code': CODES[target], 'model': c.sarvam_model}, timeout=20)
                if r.status_code in {402, 429}:
                    raise Failure(429, 'rate_limited', 'Translation allowance is unavailable. Retry later.')
                r.raise_for_status()
                translated = TranslationOutput.model_validate(r.json(), extra='ignore').translated_text
                validate_language(translated, target, part)
                outputs.append(translated)
            result = ' '.join(outputs)
            # Validate the combined response too: individually valid chunks can
            # exceed the output ceiling and otherwise poison the persisted cache.
            TranslationOutput(translated_text=result)
            await self.control('cache_put', {'key': cache, 'result': {'translated_text': result}})
            return result, False
        except Failure:
            raise
        except (httpx.HTTPError, ValueError, KeyError, TypeError):
            raise Failure(503, 'translation_unavailable', 'Translation failed. Original remains available.') from None

    async def process(self, task, payload, identity):
        actor, token = identity
        if task == 'summary':  # Retain existing exactly-three-line endpoint.
            return await super().process(task, payload, identity)
        row = await self.source(payload.entity_type, payload.entity_id, token)
        text = row['body']
        entity = f'{payload.entity_type}:{payload.entity_id}'
        if task == 'translation':
            if row['language'] == payload.target_language:
                return {'translated_text': text, 'original_language': row['language'],
                        'target_language': payload.target_language, 'is_cached': False,
                        'label': 'Original', 'provenance': 'original'}
            translated, cached = await self.translate_text(text, row['language'],
                                                          payload.target_language, actor, entity)
            if await self.source(payload.entity_type, payload.entity_id, token) != row:
                raise Failure(409, 'content_changed', 'Content changed. Refresh and retry.')
            return {'translated_text': translated, 'original_language': row['language'],
                    'target_language': payload.target_language, 'is_cached': cached,
                    'label': 'Translated by AI', 'provenance': 'cache' if cached else 'live',
                    'provider': 'sarvam', 'evaluation': 'experimental'}
        if row['author_id'] != actor:
            raise Failure(403, 'forbidden', 'Only the author can request screening.')
        if row['moderation_state'] != 'pending':
            return {'status': row['moderation_state'], 'reason_code': 'existing_decision',
                    'needs_review': row['moderation_state'] != 'allowed', 'provenance': 'original'}
        if not self.config.ai_language_review_passed:
            raise Failure(503, 'evaluation_pending', 'Saved privately. Human language/policy review is pending.')
        english, _ = await self.translate_text(text, row['language'], 'en', actor, entity)
        output = await self.generate('moderation',
            json.dumps({'original': text, 'english_translation': english}, ensure_ascii=False), 'en', actor)
        if output['confidence'] < .9 or output['needs_review'] or (
                output['status'] == 'allowed' and output['reason_code'] != 'none'):
            output['status'] = 'flagged'
        if output['status'] == 'blocked' and output['reason_code'] not in {
                'threat', 'hate', 'doxxing', 'sexual_extortion', 'intimate_abuse'}:
            output['status'] = 'flagged'
        await self.control('moderate_commit', {'entity_type': payload.entity_type,
            'id': str(payload.entity_id), 'actor': actor,
            'source_hash': hashlib.sha256(text.encode()).hexdigest(), 'decision': output['status'],
            'reason_code': output['reason_code'], 'model_id': self.config.ai_moderation_model,
            'prompt_version': VERSION})
        return {**output, 'needs_review': output['status'] != 'allowed', 'provenance': 'live'}

    async def submit(self, payload, identity):
        _actor, token = identity
        args = {'p_request_id': str(payload.request_id), 'p_body': payload.body,
                'p_language': payload.language}
        if payload.entity_type == 'reply':
            args.update(p_conversation_id=str(payload.conversation_id),
                        p_parent_reply_id=str(payload.parent_reply_id) if payload.parent_reply_id else None)
        result = await self.rpc('submit_' + payload.entity_type, args, token)
        if result['deleted']:
            return {**result, 'saved': True, 'screening_status': 'deleted', 'retryable': False}
        try:
            screened = await self.process('moderation', EntityRequest(
                entity_type=payload.entity_type, entity_id=result['id']), identity)
            return {**result, 'moderation_state': screened['status'], 'saved': True,
                    'screening_status': 'complete', 'retryable': False}
        except Failure as error:
            return {**result, 'saved': True, 'screening_status': error.code, 'retryable': True}

    async def summarize(self, payload, identity):
        actor, token = identity
        row = await self.source(payload.entity_type, payload.entity_id, token)
        text = (json.dumps({'headline': row['title'], 'excerpt': row['excerpt'] or ''},
                           ensure_ascii=False) if payload.entity_type == 'news' else row['body'])
        basis = 'headline_excerpt' if payload.entity_type == 'news' else 'author_post'
        # Deterministic source sufficiency floor prevents obvious padding.
        available = row.get('excerpt', '') if payload.entity_type == 'news' else text
        if len((available or '').split()) < 35:
            raise Failure(400, 'insufficient_source', 'There is not enough source text for a useful summary.')
        entity = f'{payload.entity_type}:{payload.entity_id}'
        key = self.cache_key('english-summary', text, 'en', self.config.ai_summary_model, entity)
        cached = await self.control('cache_get', {'key': key})
        try:
            output = DemoSummaryOutput.model_validate(cached) if cached else None
        except ValueError:
            raise Failure() from None
        if output is None:
            raw = await self.generate('demo_summary', text, 'en', actor)
            output = DemoSummaryOutput.model_validate(raw)
            await self.control('cache_put', {'key': key, 'result': output.model_dump()})
        if output.insufficient_source:
            raise Failure(400, 'insufficient_source', 'There is not enough source text for a useful summary.')
        for line in output.lines:
            validate_language(line, 'en', text)
        native, native_status = [], 'original' if payload.target_language == 'en' else 'unavailable'
        native_cached = True
        if payload.target_language == 'en':
            native = output.lines
        else:
            try:
                # One bounded provider request; preserve line association explicitly.
                translated, native_cached = await self.translate_text('\n'.join(output.lines), 'en',
                    payload.target_language, actor, entity + ':summary')
                native = [s.strip() for s in translated.split('\n') if s.strip()]
                if len(native) != len(output.lines):
                    native = []
                    for index, line in enumerate(output.lines):
                        translated_line, hit = await self.translate_text(line, 'en',
                            payload.target_language, actor, entity + f':summary:{index}')
                        native_cached = native_cached and hit
                        native.append(translated_line)
                native_status = 'available'
            except Failure:
                # Do not expose half a summary or call a failed native request cached.
                native = []
                native_cached = False
        if await self.source(payload.entity_type, payload.entity_id, token) != row:
            raise Failure(409, 'content_changed', 'Content changed. Refresh and retry.')
        return {'english_lines': output.lines, 'native_lines': native,
                'native_language': payload.target_language, 'native_status': native_status,
                'basis': basis, 'source_url': row.get('source_url'),
                'label': 'Headline-based brief' if basis == 'headline_excerpt' else 'Author post summary',
                'is_cached': bool(cached) and (native_cached or native_status == 'unavailable'),
                'provenance': 'cache' if cached and (native_cached or native_status == 'unavailable') else 'live',
                'native_provenance': ('original' if payload.target_language == 'en' else
                    'unavailable' if native_status != 'available' else 'cache' if native_cached else 'live'),
                'english_provenance': 'cache' if cached else 'live', 'generated_by_ai': True}
