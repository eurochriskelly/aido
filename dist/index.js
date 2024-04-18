var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { platform } from "os";
import * as readline from 'readline';
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { systemPromptSuggest, systemPromptExplain, userPrompt } from "./prompts.js";
import chalk from "chalk";
import { exec } from "child_process";
const { yellow, cyan, red, blue } = chalk;
const ARGS = {
    origQuestion: '',
    question: '',
};
const getCommands = (type, input) => __awaiter(void 0, void 0, void 0, function* () {
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
const processArgs = () => __awaiter(void 0, void 0, void 0, function* () {
    // Read all files in the chapter directory
    const myos = process.platform;
    let origQuestion = process.argv.slice(2).join(' ');
    if (!origQuestion.trim()) {
        // Ask the user what they want
        process.stdout.write(yellow('What can I do for you ? '));
        origQuestion = yield new Promise(resolve => {
            process.stdin.resume();
            process.stdin.once('data', data => resolve(data.toString().trim()));
        });
    }
    ARGS.origQuestion = origQuestion;
    ARGS.question = [
        `Hello Jeff. My operating system is ${myos}. `,
        `The time is ${new Date()}. `,
        `And my question is: ${origQuestion}`,
    ].join('');
});
const getCommandByIndex = (commands, choice) => {
    const index = parseInt(choice);
    if (index > commands.length) {
        console.log('Invalid choice');
        process.exit(1);
    }
    return commands[index - 1];
};
const hallucinateWarning = () => {
    console.log(red('-----'));
    console.log(red(`WARNING: LLM's can hallucinate. Run at your own risk.`));
    console.log(red('-----'));
    console.log('');
};
const readChar = () => {
    return new Promise((resolve, reject) => {
        readline.emitKeypressEvents(process.stdin);
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }
        const handler = (chunk, key) => {
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
const displayCommand = (command) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('');
    console.log(blue('Selected command:'));
    console.log(`  ${cyan(':')} ${command.command}`);
    console.log(blue('Explanation: '));
    let exp = command === null || command === void 0 ? void 0 : command.explanation;
    if (!exp) {
        exp = yield getCommands('explain', [
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
        .map(x => `  ${cyan(':')} ${x}`).join('\n'));
    const commonOpts = `${cyan('Q')}uit/${cyan('R')}un/${cyan('E')}dit`;
    process.stdout.write(yellow('How would you like to proceed? ' + commonOpts + ': '));
    const choice = yield readChar();
    return choice;
});
const copyToClipboard = (command) => __awaiter(void 0, void 0, void 0, function* () {
    const sysCopyProg = platform() === 'darwin' ? 'pbcopy' : (platform() === 'linux' ? 'xclip -selection clipboard' : undefined);
    if (!sysCopyProg) {
        console.error(red('Clipboard utility not available on this platform.'));
        process.exit(1);
    }
    const commandToClipboard = `echo "${command.replace(/"/g, '\\"')}" | ${sysCopyProg}`;
    console.log(commandToClipboard);
    exec(commandToClipboard, function (err, stdout, stderr) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('copying to clipboard ...');
            if (err) {
                console.error(err);
            }
            console.log(blue("Copied to clipboard!"));
        });
    });
});
const displayCommands = (question) => __awaiter(void 0, void 0, void 0, function* () {
    const t1 = (new Date()).valueOf();
    const response = yield getCommands('suggest', ARGS.question);
    const t2 = (new Date()).valueOf();
    console.log(blue(`[${(t2 - t1) / 1000} s]`));
    // get the user to enter a question from the terminal
    const commands = response.split('===').map(x => x.trim()).filter(x => x).map(c => ({
        command: c,
        explanation: null
    }));
    // Go off and get the explanations for the commands
    Promise.all(commands.map((command) => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield getCommands('explain', [
            `Hi Jeff, I asked you this question: `,
            `Question: "${ARGS.question}"`,
            `You provided me with this command.`,
            `${command.command}`,
            `Please explain what it does: `,
            ''
        ].join('\n'));
        command.explanation = response;
    })));
    console.log(yellow('Choose a command to run:'));
    commands.forEach((command, i) => {
        const cmd = command.command.split('\n').filter(x => x.trim());
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
        console.log('No commands found');
        process.exit(1);
    }
    else {
        console.log('');
        process.stdout.write(yellow(`Command ${cyan('#')}: `));
    }
    return commands;
});
const goodBye = () => {
    console.log('');
    console.log(blue('Goodbye!'));
    process.exit(0);
};
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    hallucinateWarning();
    yield processArgs();
    console.log(blue(`Question: "${ARGS.origQuestion}"`));
    process.stdout.write(blue('Thinking ... '));
    const commands = yield displayCommands(ARGS.question);
    // get the user to provide a single char and then proceed. Do not wait for confirmation
    const choice = yield readChar();
    if (choice.toLowerCase() === 'q')
        goodBye();
    const command = getCommandByIndex(commands, choice);
    // await copyToClipboard(command)
    const operation = yield displayCommand(command);
    switch (operation.toLowerCase()) {
        case 'r':
            {
                console.log(blue('Running command ...'));
                exec(command.command, function (err, stdout, stderr) {
                    if (err) {
                        console.error(err);
                    }
                    console.log(stdout);
                    console.error(stderr);
                    process.exit(0);
                });
            }
            break;
        case 'e':
            {
                console.log('Editing not yet supported');
                process.exit(0);
            }
            break;
        case 'q':
            goodBye();
            break;
        default:
            break;
    }
});
main();
