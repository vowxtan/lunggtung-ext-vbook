load('config.js');

function execute() {
    return Response.success([
        { title: "Mới cập nhật", input: BASE_URL, script: "gen.js" },
        { title: "Vietsub", input: BASE_URL + "/genres/vietsub", script: "gen.js" },
        { title: "3D Hentai", input: BASE_URL + "/genres/3d", script: "gen.js" },
        { title: "Vanilla", input: BASE_URL + "/genres/vanilla", script: "gen.js" }
    ]);
}
