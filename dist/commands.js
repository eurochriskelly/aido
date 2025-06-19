var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { writeFileSync } from 'fs';
import * as path from 'path';
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { systemPromptSuggest, systemPromptExplain, userPrompt } from "./prompts.js";
import chalk from "chalk";
const { yellow, cyan, red, blue } = chalk;
export const getCommands = (type, input) => __awaiter(void 0, void 0, void 0, function* () {
    const chatModel = new ChatOpenAI({
    // openAIApiKey: process.env.OPENAI_API_KEY as string, // Cast to string; TypeScript won't automatically infer process.env types.
    });
    const prompt = ChatPromptTemplate.fromMessages([
        ['system', type === 'suggest' ? systemPromptSuggest : systemPromptExplain],
        ['user', userPrompt],
    ]);
    const chain = prompt.pipe(chatModel);
    const response = yield chain.invoke({ input });
    // const response: any = await chain.invoke({ content: 'what is the ram on this pc?' })
    return response.content;
});
export const getCommandByIndex = (commands, choice) => {
    const types = {
        'x': 'eXplain',
        't': 'reTry',
        'e': 'Edit',
        'r': 'Run',
        's': 'Save',
        'q': 'Quit'
    };
    // If choice is numeric, return commands[+choice - 1]
    const numChoice = parseInt(choice);
    if (!isNaN(numChoice)) {
        if (numChoice <= commands.length) {
            return {
                type: 'execute',
                abbrev: 'x',
                command: commands[parseInt(choice) - 1].command,
                explanation: commands[parseInt(choice) - 1].explanation,
                index: parseInt(choice),
                annotation: 'loop 1'
            };
        }
        else {
            console.log('Invalid choice [' + choice + ']!');
            process.exit(1);
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
};
export const showCommands = (question) => __awaiter(void 0, void 0, void 0, function* () {
    let currOperation = 'run';
    const t1 = (new Date()).valueOf();
    const response = yield getCommands('suggest', question);
    const t2 = (new Date()).valueOf();
    console.log(blue(`[${(t2 - t1) / 1000} s]`));
    // get the user to enter a question from the terminal
    const commands = response.split('===').map(x => x.trim()).filter(x => x).map(c => ({
        type: 'execute',
        abbrev: '',
        command: c,
        explanation: null,
    }));
    // Go off and get the explanations for the commands
    Promise.all(commands.map((command) => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield getCommands('explain', [
            `Hi Jeff, I asked you this question: `,
            `Question: "${question}"`,
            `You provided me with this command.`,
            `${command.command}`,
            `Please explain what it does: `,
            ''
        ].join('\n'));
        command.explanation = response;
    })));
    console.log(yellow('Proposed solutions:'));
    commands.forEach((command, i) => {
        var _a;
        const cmd = ((_a = command.command) === null || _a === void 0 ? void 0 : _a.split('\n').filter(x => x.trim())) || [];
        if (cmd.length > 1) {
            console.log(`  ${cyan(`${i + 1}:`)}`);
            cmd.forEach((line, i) => {
                if (i === 0) {
                    console.log(`   ${cyan(':')} ${line}`);
                }
                else {
                    console.log(`   ${cyan(':')} ${line}`);
                }
            });
        }
        else {
            console.log(`  ${cyan(`${i + 1}:`)} ${cmd}`);
        }
    });
    if (commands.length === 0) {
        console.log('No suggestion?! ');
        process.exit(1);
    }
    else {
        console.log('');
        const makeOpt = (label) => {
            // make label yellow with any uppercase letters cyan
            return label.split('').map((x) => x === x.toUpperCase() ? cyan(x) : x).join('');
        };
        const opts = ['eXplain', 'Run', 'Save', 'Edit', 'reTry', 'Quit']
            .filter((x) => x.toLowerCase() !== currOperation)
            .map(makeOpt)
            .join('/');
        process.stdout.write(yellow(`Enter ${cyan('command #')} to ${cyan(currOperation.toUpperCase())} or [${opts}]: `));
    }
    return commands;
});
export const createShellHistoryScript = (command) => {
    const shell = process.env.SHELL || '';
    const escapedCommand = command.replace(/"/g, '\\"');
    let scriptContent = '';
    if (shell.includes('zsh')) {
        scriptContent = [
            '#!/bin/bash',
            `fc -R`,
            `print -s "${escapedCommand}"`
        ].join('\n');
    }
    else if (shell.includes('bash')) {
        scriptContent = `history -s "${escapedCommand}" && history -a`;
    }
    else {
        throw new Error(`Unsupported shell: ${shell}`);
    }
    const tmpFilePath = path.join('/tmp', 'aido-next.sh');
    writeFileSync(tmpFilePath, scriptContent);
    return tmpFilePath;
};
