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
                resolve(data);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

get('https://hentaiz1.com/watch/todo-no-tsumari-1')
    .then(html => {
        const idx = html.indexOf('space-y-3');
        if (idx !== -1) {
            console.log('HTML around space-y-3:', html.substring(idx - 100, idx + 500));
        }
    })
    .catch(err => {
        console.error(err);
    });
