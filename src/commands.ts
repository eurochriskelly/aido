import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import * as os from 'os';
import * as path from 'path';

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

export const getCommandByIndex = (commands: Command[], choice: string): Command | undefined => {
  const numChoice = parseInt(choice);
  if (!isNaN(numChoice) && numChoice > 0 && numChoice <= commands.length) {
    const command = commands[numChoice - 1];
    command.index = numChoice;
    return command;
  }
  return undefined;
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
    process.stdout.write(yellow(`Enter ${cyan('command #')} to select, or [${cyan('Q')}]uit: `));
  }
  return commands 
}
