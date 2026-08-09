import * as p from '@phosphor-icons/react';
console.log(Object.keys(p).filter(k => 
  ['History', 'XCircle', 'DotsThree', 'CheckDouble', 'ArrowsClockwise', 'CornersOut', 'Shuffle', 'Command', 'ChatText', 'Table', 'Lightbulb', 'DotsSixVertical', 'ArrowUp', 'ArrowDown', 'Pulse', 'Heartbeat', 'Activity', 'CodeBlock', 'Brackets'].includes(k)
).join(', '));
