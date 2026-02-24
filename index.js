const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

const builder = new addonBuilder({
    id: "org.ophim.vietnam",
    version: "1.0.0",
    name: "OPhim VN",
    description: "Nguồn OPhim",
    catalogs: [{ type: "movie", id: "ophim_new", name: "Phim Mới" }],
    resources: ["catalog", "meta", "stream"],
    types: ["movie", "series"],
    idPrefixes: ["ophim_"]
});

builder.defineCatalogHandler(async ({ id }) => {
    if (id === "ophim_new") {
        const res = await axios.get("https://ophim1.com/danh-sach/phim-moi-cap-nhat?page=1");
        return { metas: res.data.items.map(p => ({ id: `ophim_${p.slug}`, type: "movie", name: p.name, poster: `https://img.ophim.live/uploads/movies/${p.thumb_url}` })) };
    }
    return { metas: [] };
});

builder.defineMetaHandler(async ({ id }) => {
    const res = await axios.get(`https://ophim1.com/phim/${id.replace("ophim_", "")}`);
    const p = res.data.movie;
    return { meta: { id, type: "movie", name: p.name, poster: p.thumb_url, description: p.content } };
});

builder.defineStreamHandler(async ({ id }) => {
    const res = await axios.get(`https://ophim1.com/phim/${id.replace("ophim_", "")}`);
    return { streams: res.data.episodes[0].server_data.map(ep => ({ title: `Tập ${ep.name}`, url: ep.link_m3u8 })) };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 8080 });
