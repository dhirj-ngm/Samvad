import { Text, View, type ColorValue, type ViewStyle } from 'react-native';
import { colors } from '../theme/tokens';

export type IconName = 'home' | 'search' | 'plus' | 'person' | 'bell' | 'chat' | 'heart' | 'repost' | 'back' | 'arrow' | 'settings' | 'sparkles' | 'globe' | 'book';

/** Native shapes keep navigation icons consistent without a new dependency. */
export function Icon({ name, size = 22, color = colors.ink, filled = false }: {
  name: IconName; size?: number; color?: ColorValue; filled?: boolean;
}) {
  const line = (style: ViewStyle, key: string) => <View key={key} style={[{ position: 'absolute', backgroundColor: color, borderRadius: 2 }, style]} />;
  const outline = (style: ViewStyle, key: string) => <View key={key} style={[{ position: 'absolute', borderWidth: 1.8, borderColor: color }, style]} />;
  let shape;
  switch (name) {
    case 'home': shape = <>{outline({ width: 14, height: 14, left: 5, top: 7, borderTopLeftRadius: 2, transform: [{ rotate: '45deg' }] }, 'roof')}{outline({ width: 14, height: 12, left: 5, top: 10, backgroundColor: filled ? color : colors.surface, borderTopWidth: 0, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }, 'house')}{line({ width: 3, height: 6, left: 11, top: 16, backgroundColor: filled ? colors.surface : color }, 'door')}</>; break;
    case 'search': shape = <>{outline({ width: 14, height: 14, borderRadius: 8, left: 3, top: 2 }, 'circle')}{line({ width: 9, height: 2, left: 15, top: 18, transform: [{ rotate: '45deg' }] }, 'handle')}</>; break;
    case 'plus': shape = <>{line({ width: 18, height: 2, left: 3, top: 11 }, 'h')}{line({ width: 2, height: 18, left: 11, top: 3 }, 'v')}</>; break;
    case 'person': shape = <>{outline({ width: 9, height: 9, borderRadius: 6, left: 7.5, top: 2, backgroundColor: filled ? color : 'transparent' }, 'head')}{outline({ width: 18, height: 9, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, left: 3, top: 14 }, 'body')}</>; break;
    case 'chat': shape = <>{outline({ left: 2, top: 3, width: 20, height: 15, borderRadius: 6 }, 'bubble')}{line({ left: 5, top: 17, height: 5, width: 2, transform: [{ rotate: '25deg' }] }, 'tail')}</>; break;
    case 'bell': shape = <>{outline({ width: 15, height: 16, left: 4.5, top: 3, borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }, 'bell')}{line({ width: 5, height: 2, left: 9.5, top: 22 }, 'clapper')}</>; break;
    case 'heart': shape = <Text style={{ color, fontSize: 27, lineHeight: 28, textAlign: 'center', marginTop: -2 }}>{filled ? '♥' : '♡'}</Text>; break;
    case 'sparkles': shape = <Text style={{ color, fontSize: 25, lineHeight: 26, textAlign: 'center' }}>✧</Text>; break;
    case 'back': case 'arrow': shape = <View style={{ width: 24, height: 24, transform: [{ rotate: name === 'arrow' ? '180deg' : '0deg' }] }}>{line({ width: 18, height: 2, left: 3, top: 11 }, 'shaft')}{line({ width: 10, height: 2, left: 2, top: 8, transform: [{ rotate: '-45deg' }] }, 'a')}{line({ width: 10, height: 2, left: 2, top: 14, transform: [{ rotate: '45deg' }] }, 'b')}</View>; break;
    case 'repost': shape = <>{outline({ width: 16, height: 13, left: 4, top: 5, borderRadius: 3, borderRightWidth: 0, borderLeftWidth: 0 }, 'loop')}{line({ width: 2, height: 8, left: 4, top: 5 }, 'l')}{line({ width: 2, height: 8, left: 18, top: 10 }, 'r')}{line({ width: 6, height: 2, left: 1, top: 6, transform: [{ rotate: '-45deg' }] }, 'a')}{line({ width: 6, height: 2, left: 17, top: 17, transform: [{ rotate: '-45deg' }] }, 'b')}</>; break;
    case 'settings': shape = <>{[6, 12, 18].map((y, i) => <View key={y}>{line({ width: 20, height: 1.8, left: 2, top: y }, 'bar')}{outline({ width: 5, height: 5, borderRadius: 3, left: i === 1 ? 14 : 6, top: y - 1.5, backgroundColor: colors.surface }, 'knob')}</View>)}</>; break;
    case 'globe': shape = <>{outline({ width: 21, height: 21, borderRadius: 11, left: 1.5, top: 1.5 }, 'outer')}{outline({ width: 9, height: 21, borderRadius: 11, left: 7.5, top: 1.5 }, 'inner')}{line({ width: 20, height: 1.5, left: 2, top: 11 }, 'eq')}</>; break;
    case 'book': shape = <>{outline({ width: 19, height: 20, left: 3, top: 2, borderRadius: 3 }, 'book')}{line({ width: 1.5, height: 18, left: 8, top: 3 }, 'spine')}{line({ width: 7, height: 1.5, left: 11, top: 8 }, 'text')}</>; break;
  }
  return <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}><View style={{ width: 24, height: 24, transform: [{ scale: size / 24 }], transformOrigin: 'top left' }}>{shape}</View></View>;
}
