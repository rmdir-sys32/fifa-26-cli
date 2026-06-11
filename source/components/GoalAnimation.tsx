import React, {useState, useEffect} from 'react';
import {Box, Text} from 'ink';

type Props = {
	readonly onFinish: () => void;
};

const GOAL_ASCII = `
  ██████╗  ██████╗  █████╗ ██╗     ██╗   ██╗██╗██╗██╗
  ██╔════╝ ██╔═══██╗██╔══██╗██║     ██║   ██║██║██║██║
  ██║  ███╗██║   ██║███████║██║     ██║   ██║██║██║██║
  ██║   ██║██║   ██║██╔══██║██║     ╚██╗ ██╔╝╚═╝╚═╝╚═╝
  ╚██████╔╝╚██████╔╝██║  ██║███████╗ ╚████╔╝ ██╗██╗██╗
   ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚══════╝  ╚═══╝  ╚═╝╚═╝╚═╝
`;

const FRAMES: string[] = [
	// Frame 0: Kickoff
	`
  ⚽
   \\
    \\
     \\
      \\
       \\
        \\                  [ NET ]
                             |\\
                             | \\
  `,
	// Frame 1: Mid-flight
	`
  
    ⚽
     \\
      \\
       \\
        \\                  [ NET ]
                             |\\
                             | \\
  `,
	// Frame 2: Approaching net
	`
  
  
      ⚽
       \\
        \\                  [ NET ]
          \\                  |\\
                             | \\
  `,
	// Frame 3: Entering net
	`
  
  
  
          ⚽               [ NET ]
            \\                |\\
                             | \\
  `,
	// Frame 4: Hit net!
	`
  
  
  
                           [ ⚽ET ]
                             |\\
                             | \\
  `,
	// Frame 5: Net shakes!
	`
  
  
  
                           [ N⚽T ]
                             |/
                             | \\
  `,
	// Frame 6: GOAL Flash 1
	GOAL_ASCII,
	// Frame 7: Blank Flash
	`\n\n\n\n\n\n`,
	// Frame 8: GOAL Flash 2
	GOAL_ASCII,
	// Frame 9: Blank Flash
	`\n\n\n\n\n\n`,
	// Frame 10: GOAL Flash 3 (Final)
	GOAL_ASCII,
];

export default function GoalAnimation({onFinish}: Props) {
	const [frameIndex, setFrameIndex] = useState(0);

	useEffect(() => {
		// 30ms per frame for a liquid 30 FPS animation feel
		const timer = setInterval(() => {
			setFrameIndex(previousIndex => {
				if (previousIndex >= FRAMES.length - 1) {
					clearInterval(timer);
					setTimeout(onFinish, 400); // Small pause at the end
					return previousIndex;
				}

				return previousIndex + 1;
			});
		}, 120); // 120ms to make it easily visible and readable in standard terminal frames

		return () => {
			clearInterval(timer);
		};
	}, [onFinish]);

	const currentFrame = FRAMES[frameIndex] || '';
	const isGoalText = currentFrame === GOAL_ASCII;

	return (
		<Box
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			borderStyle="round"
			borderColor="yellow"
			padding={2}
			width={76}
			height={14}
		>
			<Text bold color="yellow">
				⚽⚽ GOAL! GOAL! GOAL! ⚽⚽
			</Text>
			<Box height={7} marginTop={1} justifyContent="center" alignItems="center">
				<Text color={isGoalText ? 'green' : 'white'} bold={isGoalText}>
					{currentFrame}
				</Text>
			</Box>
			<Box marginTop={1}>
				<Text dimColor>[ Animating Live Match Event ]</Text>
			</Box>
		</Box>
	);
}
