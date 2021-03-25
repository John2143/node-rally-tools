#!/bin/bash

#THING=$(head -n 1 <copies.txt)

while read THING; do
bash -c "aws s3 cp --profile rallymigrate $THING"
done <copies.txt
