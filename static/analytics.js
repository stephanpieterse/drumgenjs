/* jshint strict: false */
/* global navigator */

var analyticsData = {};
analyticsData.pathname = window.location.pathname;
analyticsData.timeInState = {
    "hidden": 0,
    "visible": 0
};
var lastTime = Date.now();

function logData() {
    try {
        analyticsData.timeOnPage = performance.now();
        analyticsData.pageEntries = performance.getEntries();
        navigator.sendBeacon("/analytics", JSON.stringify(analyticsData));
    } catch (e) {
        // Can't do much here
    }
}

window.addEventListener("unload", logData, false);
window.addEventListener("visibilitychange", function() {
    try {
        var oldState = document.visibilityState === 'visible' ? 'hidden' : 'visible';
        var diffTime = Date.now() - lastTime;
        lastTime = Date.now();
        analyticsData.timeInState[oldState] += diffTime;
    } catch (e) {
        console.log(e);
    }
});
