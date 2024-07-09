import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { systemPromptSuggest, systemPromptExplain, userPrompt } from "./prompts.js";
import chalk from "chalk";
const { yellow, cyan, red, blue } = chalk

export interface Command {
  // enum: ['execute', 'edit', 'quit']
  type: string
  abbrev: string
  command: string | null
  explanation: string | null
  index?: number,
  annotation?: string
}


export const getCommands = async (type: string, input: string): Promise<string> => {
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

export const getCommandByIndex = (commands: Command[], choice: string): Command => {
  const types: any = {
    'x': 'eXplain',
    't': 'reTry',
    'e': 'Edit',
    'r': 'Run',
    's': 'Save',
    'q': 'Quit'
  }
  // If choice is numeric, return commands[+choice - 1]
  const numChoice = parseInt(choice);
  if (!isNaN(numChoice) ) {
    if (numChoice <= commands.length) {
      return {
        type: 'execute',
        abbrev: 'x',
        command: commands[parseInt(choice) - 1].command,
        explanation: commands[parseInt(choice) - 1].explanation,
        index: parseInt(choice),
        annotation: 'loop 1'
      };
    } else {
      console.log('Invalid choice [' + choice + ']!');
      process.exit(1)
    }
  }

  return {
    type: types[choice],
    abbrev: choice,
    command: commands[parseInt(choice) - 1].command,
    explanation: commands[parseInt(choice) - 1].explanation,
    index: 0,
    annotation: 'loop 2'
  };
}

export const showCommands = async (question: string): Promise<Command[]> => {
  let currOperation = 'run'
  const t1 = (new Date()).valueOf();
  const response = await getCommands('suggest', question);
  const t2 = (new Date()).valueOf();
  console.log(blue(`[${(t2 - t1) / 1000} s]`));
  // get the user to enter a question from the terminal
  const commands: Command[] = response.split('===').map(x => x.trim()).filter(x => x).map(c => ({
    type: 'execute',
    abbrev: '',
    command: c,
    explanation: null,
  }))
  // Go off and get the explanations for the commands
  Promise.all(commands.map(async command => {
    const response = await getCommands('explain', [
      `Hi Jeff, I asked you this question: `,
      `Question: "${question}"`,
      `You provided me with this command.`,
      `${command.command}`,
      `Please explain what it does: `,
      ''
    ].join('\n'));
    command.explanation = response
  }))
  console.log(yellow('Proposed solutions:'))
  commands.forEach((command, i) => {
    const cmd = command.command?.split('\n').filter(x => x.trim()) || []
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
    console.log('');
    const makeOpt = (label: string) => {
      // make label yellow with any uppercase letters cyan
      return label.split('').map((x: string) => x === x.toUpperCase() ? cyan(x) : x).join('')
    } 
    const opts = ['eXplain', 'Run', 'Save', 'Edit','reTry', 'Quit']
      .filter((x: string) => x.toLowerCase() !== currOperation)
      .map(makeOpt)
      .join('/')
    process.stdout.write(yellow(`Enter ${cyan('command #')} to ${cyan(currOperation.toUpperCase())} or [${opts}]: `));
  }
  return commands 
}


