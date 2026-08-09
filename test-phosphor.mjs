import * as p from '@phosphor-icons/react';
console.log(Object.keys(p).filter(k => k.toLowerCase().includes('activity') || k.toLowerCase().includes('pulse') || k.toLowerCase().includes('bracket') || k.toLowerCase().includes('code') || k.toLowerCase().includes('square')).join(', '));
