var main = require('./main.js');
var threein5 = [[['r','l','l',['r','r','r','r'],'l','l'],['l','l',['R','R','R'],'l','l'],'r',['l','l',['r',['l',['r','r','r','r','r']],'r']]]];
var quart3 = [['r',[['l','l','l']]]];

var ref = main.exportBlocks(threein5);
var linkbase= "https://drumgen-dev.apollolms.co.za/public/image?app=true&patref="
console.log(linkbase + ref);
