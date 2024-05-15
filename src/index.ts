import { platform } from "os";
import * as readline from 'readline';
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { systemPromptSuggest, systemPromptExplain, userPrompt } from "./prompts.js";
import chalk from "chalk";
import { exec } from "child_process";
import { exit } from "process";

const { yellow, cyan, red, blue } = chalk

interface Command {
  command: string
  explanation: string | null 
}

interface AllowedArguments {
  origQuestion: string
  question: string
}

const ARGS: AllowedArguments = {
  origQuestion: '',
  question: '',
}

const getCommands = async (type: string, input: string): Promise<string> => {
  const chatModel = new ChatOpenAI({
    // openAIApiKey: process.env.OPENAI_API_KEY as string, // Cast to string; TypeScript won't automatically infer process.env types.
  });
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', type === 'suggest' ? systemPromptSuggest : systemPromptExplain],
    ['user', userPrompt],
  ])
  const chain = prompt.pipe(chatModel)
  const response: any = await chain.invoke({ input })
  // const response: any = await chain.invoke({ content: 'what is the ram on this pc?' })
  return response.content
}

const processArgs = async () => {
  // Read all files in the chapter directory
  const myos = process.platform
  let origQuestion = process.argv.slice(2).join(' ')
  if (!origQuestion.trim()) {
    // Ask the user what they want
    process.stdout.write(yellow('What can I do for you ? '));
    origQuestion = await new Promise<string>(resolve => {
      process.stdin.resume();
      process.stdin.once('data', data =>
        resolve(data.toString().trim())
      );
    })
  }
  ARGS.origQuestion = origQuestion;
  ARGS.question = [
    `Hello Jeff. My operating system is ${myos}. `,
    `The time is ${new Date()}. `,
    `And my question is: ${origQuestion}`,
  ].join('')
}


const getCommandByIndex = (commands: Command[], choice: string): (Command | string) => {
  // If choice is numeric, return commands[+choice - 1]
  // If choice is a letter, return that letter
  if (isNaN(parseInt(choice))) {
    return choice;
  }
  const index = parseInt(choice)
  if (index > commands.length) {
    console.log('Invalid choice')
    process.exit(1)
  }
  return commands[index - 1]
}

const hallucinateWarning = () => {
  console.log(red('-----'))
  console.log(red(`WARNING: LLM's can hallucinate. Run at your own risk.`));
  console.log(red('-----'))
  console.log('')
}

const readChar = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    const handler = (chunk: any, key: any) => {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
      process.stdin.removeListener('keypress', handler); // Clean up the listener
      resolve(key.sequence);
    };

    process.stdin.on('keypress', handler);
    process.stdin.on('error', (err) => {
      reject(err);
    });

    process.stdin.resume(); // Ensure stdin is in a listening state
  });
};

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
  console.log(exp.split('\n')
    .filter(x => x.trim())
    .filter(x => x !== '===')
    .map(x => `  ${cyan(':')} ${x}`).join('\n'))
  return 'x'
}

const copyToClipboard = async (command: string): Promise<void> => {
  const sysCopyProg = platform() === 'darwin' ? 'pbcopy' : (platform() === 'linux' ? 'xclip -selection clipboard' : undefined);
  if (!sysCopyProg) {
    console.error(red('Clipboard utility not available on this platform.'));
    process.exit(1);
  }
  const commandToClipboard = `echo "${command.replace(/"/g, '\\"')}" | ${sysCopyProg}`;
  console.log(commandToClipboard)
  exec(commandToClipboard, async function (err: any, stdout: any, stderr: any) {
    console.log('copying to clipboard ...')
    if (err) {
      console.error(err)
    }
    console.log(blue("Copied to clipboard!"));
  });
}

const showCommands = async (question: string): Promise<Command[]> => {
  let currOperation = 'run'
  const t1 = (new Date()).valueOf();
  const response = await getCommands('suggest', ARGS.question);
  const t2 = (new Date()).valueOf();
  console.log(blue(`[${(t2 - t1) / 1000} s]`));
  // get the user to enter a question from the terminal
  const commands: Command[] = response.split('===').map(x => x.trim()).filter(x => x).map(c => ({
    command: c,
    explanation: null
  }))
  // Go off and get the explanations for the commands
  Promise.all(commands.map(async command => {
    const response = await getCommands('explain', [
      `Hi Jeff, I asked you this question: `,
      `Question: "${ARGS.question}"`,
      `You provided me with this command.`,
      `${command.command}`,
      `Please explain what it does: `,
      ''
    ].join('\n'));
    command.explanation = response
  }))
  console.log(yellow('Choose a command to run:'))
  commands.forEach((command, i) => {
    const cmd = command.command.split('\n').filter(x => x.trim())
    if (cmd.length > 1) {
      console.log(`  ${cyan(`${i + 1}:`)}`)
      cmd.forEach((line, i) => {
        if (i === 0) {
          console.log(`   ${cyan(':')} ${line}`)
        } else {
          console.log(`   ${cyan(':')} ${line}`)
        }
      })
    } else {
      console.log(`  ${cyan(`${i + 1}:`)} ${cmd}`)
    }
  })
  if (commands.length === 0) {
    console.log('No suggestion?! ')
    process.exit(1)
  } else {
    console.log('')
    const makeOpt = (label: string) => {
      // make label yellow with any uppercase letters cyan
      return label.split('').map((x: string) => x === x.toUpperCase() ? cyan(x) : x).join('')
    } 
    const opts = ['eXplain', 'Run', 'Edit', 'Quit']
      .filter((x: string) => x.toLowerCase() !== currOperation)
      .map(makeOpt)
      .join('/')
    process.stdout.write(yellow(`[${opts}] Command to ${blue(currOperation)} ${cyan('#')}: `));
  }
  return commands 
}

const goodBye = () => { 
  console.log('')
  console.log(blue('Goodbye!'))
  process.exit(0)
}

const main = async (): Promise<void> => {
  // hallucinateWarning();
  await processArgs();
  console.log(blue(`... Question: "${ARGS.origQuestion}"`));
  process.stdout.write(blue('Thinking ... '));

  const commands = await showCommands(ARGS.question)
  // get the user to provide a single char and then proceed. Do not wait for confirmation
  const choice = await readChar();
  if (choice.toLowerCase() === 'q') goodBye()
  const command = getCommandByIndex(commands, choice)

  // await copyToClipboard(command)
  let operation = ''
  if (typeof command !== 'string') {
    // operation = await explainCommand(command)
    console.log('operation xxx', operation, typeof command)
  } else {
    console.log(command);
    switch (operation.toLowerCase()) {
      case 'r':
        {
          console.log(blue('Running command ...'))
          exec(command.command, function (err: any, stdout: any, stderr: any) {
            if (err) {
              console.error(err)
            }
            console.log(stdout)
            console.error(stderr)
            process.exit(0)
          });
        }
        break;
      case 'x': // Explain
        {
          // todo: wait until command is ready
          explainCommand(command)
        }
        break
      case 'e':
        {
          console.log('Editing not yet supported')
          process.exit(0)
        }
        break
      case 'q':
        goodBye()
        break
      default:
        break;
    }
  }
};

main()
