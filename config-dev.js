/* global module */
module.exports = {
    server: {
        port: 5061,
        fullhost: "https://drumgen-dev.apollolms.co.za"
    },
    tmpdir: "/opt/app/tmpgen/",
    tmpCleanupInterval: ( 5 * 60 * 1000), // 5 minutes
    tmpMaxAge: (6 * 60 * 60), // 6 hour
    tmpSizeOverMaxAge: (30), // 30 seconds
    tmpSizeLimit: (100 * 1024 ), // 100mb 
    worksheet: {
        pageItems: 20
    },
    queue: {
        timeout: 1000 * 10,
        concurrency: 1
    },
		loader: 'lilypond'
};
