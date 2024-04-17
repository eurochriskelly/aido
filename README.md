# AIDO

`aido` (pronounced "I do") is an ai terminal command generation tool inspired
by `sudo`. Just as `sudo` is short for "Super-user 'do'", `aido` comes from
"Artifical Intelligence 'do'".

# Installation

Simplest way to install is by running:

    npm install -g aido-shell

Alternatively, clone this repo and run:

    npm pack
    npm install -g aido-0.0.4.tgz

# Usage

Usage is simple tell aido what you want to do. e.g.

    aido "Log into a kubernetes pod whose name contains 'abcd'"

`aido` will check your os version and find out which commands might be useful
and provide a list of commands to run. Pick a number and press ENTER if you
agree with one of the proposed options.

*NOTE*: Aido depends on LLM's which sometimes hallucinate so make sure you
actually understand what the offered command will do before accepting. The
reponsibility for what you execute at the terminal is yours and yours alone.
