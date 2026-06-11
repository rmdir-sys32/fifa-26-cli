import React from 'react';
import test from 'ava';
import {render} from 'ink-testing-library';
import App from './app.js';

test('renders FIFA Live CLI header', t => {
	const {lastFrame} = render(<App />);

	t.true(lastFrame()?.includes('FIFA WORLD CUP 2026 LIVE CLI'));
});
