var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { systemPrompt, userPrompt } from "./prompts.js";
import chalk from "chalk";
import { exec } from "child_process";
const { yellow, cyan } = chalk;
const ARGS = {
    question: 'List files in this directory'
};
const getCommands = (input) => __awaiter(void 0, void 0, void 0, function* () {
    const chatModel = new ChatOpenAI({
    // openAIApiKey: process.env.OPENAI_API_KEY as string, // Cast to string; TypeScript won't automatically infer process.env types.
    });
    const prompt = ChatPromptTemplate.fromMessages([
        ['system', systemPrompt],
        ['user', userPrompt],
    ]);
    const chain = prompt.pipe(chatModel);
    const response = yield chain.invoke({ input });
    // const response: any = await chain.invoke({ content: 'what is the ram on this pc?' })
    return response.content;
});
const processArgs = () => {
    // Read all files in the chapter directory
    const myos = process.platform;
    ARGS.question = `My operating system is ${myos}. The time is ${new Date()}. And my question is: ${process.argv.slice(2).join(' ')}`;
};
const getCommandByIndex = (commands, choice) => {
    const index = parseInt(choice);
    if (index > commands.length) {
        console.log('Invalid choice');
        process.exit(1);
    }
    return commands[index - 1];
};
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    processArgs();
    const response = yield getCommands(ARGS.question);
    // get the user to enter a question from the terminal
    const commands = response.split('===').map(x => x.trim()).filter(x => x);
    console.log('Choose a command to run:');
    commands.forEach((command, i) => {
        const cmd = command.split('\n').filter(x => x.trim());
        if (cmd.length > 1) {
            console.log(`  ${cyan(`${i + 1}:`)}`);
            cmd.forEach(line => {
                console.log(`   ${cyan(':')} ${line}`);
            });
        }
        else {
            console.log(`  ${cyan(`${i + 1}:`)} ${command}`);
        }
    });
    if (commands.length === 0) {
        console.log('No commands found');
        process.exit(1);
    }
    else {
        if (commands.length === 1) {
            console.log(yellow(`Type 'q' to quit, 'c' to copy or press ENTER to run the command:`));
        }
        else {
            console.log(yellow(`Pick a number between 1 and ${commands.length} or type 'q' to quit, or 'c' to copy to clipboard:`));
        }
    }
    const choice = yield new Promise((resolve, reject) => {
        process.stdin.resume();
        process.stdin.once('data', data => {
            const choice = data.toString().trim();
            resolve(choice);
        });
    });
    if (choice === 'q') {
        process.exit(0);
    }
    const command = getCommandByIndex(commands, choice);
    if (choice === 'c') {
        console.log(yellow('Enter the number of the command to copy to clipboard:'));
        const choice = yield new Promise((resolve, reject) => {
            process.stdin.resume();
            process.stdin.once('data', data => {
                const choice = data.toString().trim();
                resolve(choice);
            });
        });
        const commandToCopy = getCommandByIndex(commands, choice);
        exec(`echo "${commandToCopy}" | pbcopy`, function (err, stdout, stderr) {
            if (err) {
                console.error(err);
            }
            console.log("Copied to clipboard!");
            console.log(commandToCopy);
            process.exit(0);
        });
    }
    else {
        // copy the command into the clipboard
        exec(command, function (err, stdout, stderr) {
            if (err) {
                console.error(err);
            }
            console.log(stdout);
            console.error(stderr);
            process.exit(0);
        });
    }
});
main();
