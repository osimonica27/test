if [ -v GRAPHITE_TOKEN ];then
    gt auth --token $GRAPHITE_TOKEN
fi

gt init --trunk canary
