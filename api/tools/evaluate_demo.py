"""One bounded, real moderation smoke; never publishes or approves language quality."""
import asyncio
import json

from app.config import Settings
from app.demo_ai import DemoAIService
from tools.demo_accounts import PRIVATE, ROOT


async def run():
    config = Settings(_env_file=ROOT/'api/.env.ai-demo-run')
    if not config.local_demo_mode:
        raise RuntimeError('Local rehearsal only')
    actor = json.loads(PRIVATE.read_text(encoding='utf-8'))['existing']['id']
    service = DemoAIService(config)
    try:
        result = await service.generate('moderation', json.dumps({
            'original': 'I will hurt you after class.',
            'english_translation': 'I will hurt you after class.'}), 'en', actor)
        report = {'case':'synthetic-English-direct-threat','expected':'blocked or flagged',
                  'actual':result,'provenance':'live','published':False,
                  'human_language_review_passed':False}
        (ROOT/'api/.local/demo-evaluation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
        print(json.dumps(report))
    finally:
        await service.close()


if __name__ == '__main__':
    asyncio.run(run())
