import { platform, homedir } from "os";
import chalk from "chalk";
import { exec, spawn } from "child_process";
import { readFileSync, appendFileSync, existsSync } from "fs";
import { fileURLToPath } from 'url';
import path from 'path';
import * as readline from 'readline';
import { readChar } from "./utils.js";
import { Command, getCommands, getCommandByIndex, showCommands } from "./commands.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { yellow, cyan, red, blue } = chalk

// Handle version flag
if (process.argv.includes('--version') || process.argv.includes('-v')) {
  try {
    const versionPath = path.join(__dirname, 'version.json');
    const versionData = JSON.parse(readFileSync(versionPath, 'utf-8'));
    console.log(versionData.version);
    process.exit(0);
  } catch (e) {
    console.log(red('Error reading version'));
    process.exit(1);
  }
}

interface AllowedArguments {
  origQuestion: string
  question: string
}

const ARGS: AllowedArguments = {
  origQuestion: '',
  question: '',
}

const processArgs = async () => {
  const myos = process.platform;
  let origQuestion = process.argv.slice(2).join(' ');

  if (!origQuestion.trim()) {
    const historyPath = path.join(homedir(), '.aido_history');
    const history = existsSync(historyPath)
      ? readFileSync(historyPath, 'utf-8').split('\n').filter(line => line.trim())
      : [];

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      history: history,
      prompt: yellow('How may I assist ? ')
    });

    origQuestion = await new Promise<string>(resolve => {
      rl.on('line', (line) => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          // Add to history only if it's not a duplicate of the last command
          if (history.length === 0 || history[history.length - 1] !== trimmedLine) {
            appendFileSync(historyPath, trimmedLine + '\n');
          }
        }
        rl.close();
        resolve(trimmedLine);
      });

      // Handle Ctrl+C to exit gracefully
      rl.on('SIGINT', () => {
        rl.close();
        goodBye();
      });

      rl.prompt();
    });
  }

  if (!origQuestion.trim()) {
    goodBye();
  }

  ARGS.origQuestion = origQuestion;
  ARGS.question = [
    `Hello Jeff. My operating system is ${myos}. `,
    `The time is ${new Date()}. `,
    `And my question is: ${origQuestion}`,
  ].join('');
}


const explainCommand = async (command: Command): Promise<string> => {
  console.log('')
  console.log(blue('Selected command:'))
  console.log(`  ${cyan(':')} ${command.command}`)
  console.log(blue('Explanation: '))
  let exp = command?.explanation
  if  (!exp) {
    exp = await getCommands('explain', [
      `Hi Jeff, I asked you this question: `,
      `Question: "${ARGS.question}"`,
      `You provided me with this command.`,
      `${command.command}`,
      `Please explain what it does: `,
      ''
    ].join('\n'));
  }
  console.log(exp?.split('\n')
    .filter(x => x.trim())
    .filter(x => x !== '===')
    .map(x => `  ${cyan(':')} ${x}`).join('\n'))
  return 'x'
}

const copyToClipboard = (command: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const sysCopyProg = platform() === 'darwin' ? 'pbcopy' : (platform() === 'linux' ? 'xclip -selection clipboard' : undefined);
    if (!sysCopyProg) {
      console.error(red('Clipboard utility not available on this platform.'));
      return reject(new Error('Clipboard utility not available on this platform.'));
    }
    const commandToClipboard = `echo "${command.replace(/"/g, '\\"')}" | ${sysCopyProg}`;
    console.log('copying to clipboard ...')
    exec(commandToClipboard, (err, stdout, stderr) => {
      if (err) {
        console.error(err)
        return reject(err);
      }
      console.log(blue("Copied to clipboard!"));
      resolve();
    });
  });
}

const goodBye = () => {
  console.log(blue('Goodbye!'))
  process.exit(0)
}

const main = async (): Promise<void> => {
  // hallucinateWarning();
  await processArgs();
  console.log(blue(`Question: "${ARGS.origQuestion}"`));
  process.stdout.write(blue('Thinking ... '));

  const commands = await showCommands(ARGS.question)

  // get the user to provide a single char and then proceed. Do not wait for confirmation
  const choice = await readChar();
  console.log(choice); // echo choice so user sees that they typed

  if (choice.toLowerCase() === 'q' || choice === '\u0003' || !choice.trim()) {
    goodBye();
  } 

  const command: Command | undefined = getCommandByIndex(commands, choice)

  if (!command || !command.command) {
    console.log(red('Invalid command selection.'));
    process.exit(1);
  }

  // Now, ask for the action
  console.log('');
  const makeOpt = (label: string) => label.split('').map((x: string) => x === x.toUpperCase() ? cyan(x) : x).join('');
  const opts = ['Run', 'Explain', 'Copy', 'Quit'].map(makeOpt).join('/');
  process.stdout.write(yellow(`Action for command ${cyan(command.index)}: [${opts}]: `));
  
  const actionChoice = await readChar();
  console.log(actionChoice); // echo choice

  switch (actionChoice.toLowerCase()) {
    case 'r':
      console.log(blue(`Running: ${command.command}`));
      const child = spawn(command.command, [], {
        shell: true,
        stdio: 'inherit'
      });

      child.on('error', (err) => {
        console.error(red('Failed to start subprocess.'), err);
      });

      child.on('close', (code) => {
        process.exit(code ?? 0);
      });
      break;
    case 'e':
      await explainCommand(command);
      goodBye();
      break;
    case 'c':
      await copyToClipboard(command.command);
      goodBye();
      break;
    case 'q':
      goodBye();
      break;
    default:
      console.log(red('Invalid action.'));
      goodBye();
      break;
  }
};

main()
