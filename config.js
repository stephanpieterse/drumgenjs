/* global module */
module.exports = {
    server: {
        port: 5061,
        fullhost: "https://drumgen.apollolms.co.za"
    },
    tmpdir: "/opt/app/tmpgen/",
    tmpCleanupInterval: ( 5 * 60 * 1000 ), // 5 minutes
    tmpMaxAge: (48 * 60 * 60), // 48 hour
    tmpSizeOverMaxAge: (120), // 120 seconds
    tmpSizeLimit: (300 * 1024 ), // 300mb 
    worksheet: {
        pageItems: 10
    },
    queue: {
        timeout: 1000 * 10,
        concurrency: 2
    },
    loader: 'lilypond'
};
