const https = require('https');

function get(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve(JSON.parse(data));
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

const episodeId = "mB2qj6tn0OK";
const hash = "1edhnia";
const payloadObj = [ [ "__skrao", 1 ], { "currentId": 2, "excludeIds": 3 }, episodeId, [] ];
const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64');
const apiUrl = `https://hentaiz1.com/_app/remote/${hash}/getSuggestedEpisodes?payload=${encodeURIComponent(payload)}`;

get(apiUrl)
    .then(res => {
        console.log('Suggested Episodes Result:', JSON.stringify(res, null, 2));
    })
    .catch(err => {
        console.error(err);
    });
