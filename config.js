/* global module */
module.exports = {
    server: {
        port: 5061,
        fullhost: "https://drumgen.apollolms.co.za"
    },
    tmpdir: "/opt/app/tmpgen/",
    tmpCleanupInterval: ( 5 * 60 * 1000 ), // 5 minutes
    tmpMaxAge: (24 * 60 * 60), // 24 hour
    tmpSizeOverMaxAge: (120), // 120 seconds
    tmpSizeLimit: (100 * 1024 ), // 100mb 
    worksheet: {
        pageItems: 20
    },
    queue: {
        timeout: 1000 * 10,
        concurrency: 2
    },
    loader: 'lilypond' // ? musicxml
};
