import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import axios from 'axios';

interface OnboardingProps {
	onSuccess: (apiKey: string) => void;
}

interface OnboardingKeysProps {
	input: string;
	setInput: React.Dispatch<React.SetStateAction<string>>;
	status: 'idle' | 'loading' | 'error';
	setStatus: React.Dispatch<
		React.SetStateAction<'idle' | 'loading' | 'error'>
	>;
	setErrorMsg: React.Dispatch<React.SetStateAction<string>>;
	onSuccess: (apiKey: string) => void;
}

function OnboardingKeys({
	input,
	setInput,
	status,
	setStatus,
	setErrorMsg,
	onSuccess,
}: OnboardingKeysProps) {
	useInput(async (char, key) => {
		if (status === 'loading') {
			return;
		}

		if (key.return) {
			const trimmedInput = input.trim();
			if (!trimmedInput) {
				setStatus('error');
				setErrorMsg('API key cannot be empty.');
				return;
			}

			setStatus('loading');
			try {
				const res = await axios.get(
					'https://v3.football.api-sports.io/status',
					{
						headers: {
							'x-apisports-key': trimmedInput,
						},
						timeout: 5000,
					},
				);

				if (
					res.data?.errors &&
					Object.keys(res.data.errors).length > 0
				) {
					const errs = Object.values(res.data.errors).join(', ');
					setStatus('error');
					setErrorMsg(`Invalid Key: ${errs}`);
				} else {
					onSuccess(trimmedInput);
				}
			} catch (err: any) {
				setStatus('error');
				setErrorMsg(
					`Validation failed: ${err.message || 'Network Error'}`,
				);
			}
			return;
		}

		if (key.backspace || key.delete) {
			setInput(prev => prev.slice(0, -1));
			return;
		}

		if (char && !key.ctrl && !key.meta) {
			setInput(prev => prev + char);
		}
	});

	return null;
}

export default function Onboarding({onSuccess}: OnboardingProps) {
	const [input, setInput] = useState('');
	const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
	const [errorMsg, setErrorMsg] = useState('');

	return (
		<Box flexDirection="column" padding={1}>
			{process.stdin.isTTY && (
				<OnboardingKeys
					input={input}
					setInput={setInput}
					status={status}
					setStatus={setStatus}
					setErrorMsg={setErrorMsg}
					onSuccess={onSuccess}
				/>
			)}
			<Text bold color="cyan">
				⚽ FIFA WORLD CUP 2026 LIVE CLI — ONBOARDING
			</Text>
			<Text color="gray">
				To view live sports data, please provide your API-Football API
				key.
			</Text>
			<Text color="gray">
				Get a free key at: https://dashboard.api-football.com/
			</Text>
			<Box marginY={1}>
				<Text bold>Enter API Key: </Text>
				<Box borderStyle="single" borderColor="cyan" paddingX={1}>
					<Text color="white">{input || ' '}</Text>
				</Box>
				<Text color="cyan">_</Text>
			</Box>
			{status === 'loading' && (
				<Text color="yellow">⏳ Verifying credential...</Text>
			)}
			{status === 'error' && <Text color="red">❌ {errorMsg}</Text>}
			<Box marginY={1}>
				<Text dimColor>Press Enter to Submit | Ctrl+C to Quit</Text>
			</Box>
		</Box>
	);
}
