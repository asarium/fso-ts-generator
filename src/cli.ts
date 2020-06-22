#!/usr/bin/env node

import {GeneratorCommandLine} from "./cli/GeneratorCommandLine";

const commandLine = new GeneratorCommandLine();
commandLine.execute();
