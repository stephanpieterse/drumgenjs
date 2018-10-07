alias mine='sudo chown -R $USER'
alias drun='docker run -it --rm'
#alias cordova='drun --privileged -v /dev/bus/usb:/dev/bus/usb -v $PWD:/data webratio/cordova cordova'
alias cordova='drun --privileged -v /dev/bus/usb:/dev/bus/usb -v $PWD:/data localcordova cordova'
