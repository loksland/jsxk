#!/bin/bash

# echo "The script you are running has basename `basename $0`, dirname `dirname $0`"
# echo "The present working directory is `pwd`"

cd "`dirname "$0"`"

# Calls script with the same name
node "$(basename "$0" .command).js"

$SHELL
