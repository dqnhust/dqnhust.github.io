#!/usr/bin/env node
/**
 * Static site generator for dqnhust.github.io
 *
 * Reads data.json (the single source of truth for the game catalogue) and emits:
 *   - index.html               pre-rendered catalogue (no JS needed to see content)
 *   - games/<slug>/index.html  one landing page per game
 *   - sitemap.xml
 *   - robots.txt
 *
 * Run `node build.js` after editing data.json, then commit the result.
 */

var fs = require("fs");
var path = require("path");

var SITE = "https://dqnhust.github.io";
var SITE_NAME = "TumbGames";
var AUTHOR = "dqnhust";
var ADSENSE = "ca-pub-6771081243960686";

var imageExtRegex = /\.(jpe?g|png|gif|webp|bmp|svg|avif)(\?.*)?$/i;

/* ------------------------------------------------------------------ utils */

function esc(text) {
    return String(text == null ? "" : text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// data.json descriptions already contain entities such as "&amp;" left over
// from the old innerHTML pipeline. Decode once so esc() does not double-encode.
function decodeEntities(text) {
    return String(text == null ? "" : text)
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
}

function slugify(name) {
    return decodeEntities(name)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function youtubeId(url) {
    var m = /youtube\.com\/(?:embed|v)\/([A-Za-z0-9_-]{6,})/.exec(url || "");
    if (m) return m[1];
    m = /[?&]v=([A-Za-z0-9_-]{6,})/.exec(url || "");
    return m ? m[1] : null;
}

function mediaType(item) {
    if (item.mediaType) return item.mediaType;
    if (item.imageURL) return "image";
    return imageExtRegex.test(item.videoURL || "") ? "image" : "video";
}

// Best available social-share / structured-data image for an entry.
function previewImage(item) {
    if (item.imageURL) return item.imageURL;
    var id = youtubeId(item.videoURL);
    if (id) return "https://i.ytimg.com/vi/" + id + "/maxresdefault.jpg";
    return SITE + "/images/icon.png";
}

function clamp(text, max) {
    var t = decodeEntities(text).replace(/\s+/g, " ").trim();
    if (t.length <= max) return t;
    return t.slice(0, max - 1).replace(/[\s,.;:-]+\S*$/, "") + "...";
}

// "Android/iOS" and "Android, iOS" both mean the same two stores.
function platforms(item) {
    return decodeEntities(item.platform || "")
        .split(/[\/,]+/)
        .map(function (p) { return p.trim(); })
        .filter(Boolean);
}

function storeLinks(item) {
    var out = { android: null, ios: null };
    (item.buttons || []).forEach(function (b) {
        if (!b.url) return;
        if (/play\.google\.com/.test(b.url)) out.android = b.url;
        else if (/(itunes|apps)\.apple\.com/.test(b.url)) out.ios = b.url;
    });
    return out;
}

/* -------------------------------------------------------------- templates */

function head(opts) {
    var rel = opts.rel || "";
    return [
        '<!DOCTYPE html>',
        '<html lang="en">',
        '<head>',
        '<meta charset="utf-8">',
        '<meta http-equiv="X-UA-Compatible" content="IE=edge">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        '<title>' + esc(opts.title) + '</title>',
        '<meta name="description" content="' + esc(opts.description) + '">',
        '<meta name="author" content="' + esc(SITE_NAME) + '">',
        '<link rel="canonical" href="' + esc(opts.canonical) + '">',
        '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">',
        '<meta property="og:type" content="' + esc(opts.ogType || "website") + '">',
        '<meta property="og:site_name" content="' + esc(SITE_NAME) + '">',
        '<meta property="og:title" content="' + esc(opts.title) + '">',
        '<meta property="og:description" content="' + esc(opts.description) + '">',
        '<meta property="og:url" content="' + esc(opts.canonical) + '">',
        '<meta property="og:image" content="' + esc(opts.image) + '">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="twitter:title" content="' + esc(opts.title) + '">',
        '<meta name="twitter:description" content="' + esc(opts.description) + '">',
        '<meta name="twitter:image" content="' + esc(opts.image) + '">',
        '<link rel="icon" href="' + rel + 'images/icon.png">',
        '<link rel="preconnect" href="https://i.ytimg.com">',
        '<link href="' + rel + 'css/bootstrap.min.css" rel="stylesheet">',
        '<link href="' + rel + 'css/1-col-portfolio.css" rel="stylesheet">',
        '<script type="application/ld+json">' + JSON.stringify(opts.jsonLd) + '</scr' + 'ipt>',
        '<script data-ad-client="' + ADSENSE + '" async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></scr' + 'ipt>',
        '</head>',
        '<body>'
    ].join("\n");
}

function nav(rel) {
    var home = rel || "./";
    return [
        '<nav class="navbar navbar-inverse navbar-fixed-top" role="navigation">',
        '<div class="container">',
        '<div class="navbar-header">',
        '<button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#main-nav">',
        '<span class="sr-only">Toggle navigation</span>',
        '<span class="icon-bar"></span><span class="icon-bar"></span><span class="icon-bar"></span>',
        '</button>',
        '<a class="navbar-brand" href="' + home + '">' + esc(SITE_NAME) + '</a>',
        '</div>',
        '<div class="collapse navbar-collapse" id="main-nav">',
        '<ul class="nav navbar-nav">',
        '<li><a href="' + home + '">All Games</a></li>',
        '<li><a href="https://github.com/' + AUTHOR + '" rel="noopener">About</a></li>',
        '<li><a href="mailto:quangnam.a10@gmail.com">Contact</a></li>',
        '<li><a href="' + rel + 'GooglePlay_privacy_policy.html">Privacy Policy</a></li>',
        '</ul>',
        '</div>',
        '</div>',
        '</nav>'
    ].join("\n");
}

// The site is no longer maintained; point every visitor to tumbgames.com.
function deprecationBanner() {
    return [
        '<div class="alert alert-warning" role="alert" style="margin:20px 0;padding:24px;border:2px solid #f0ad4e;text-align:center;">',
        '<h2 style="margin-top:0;font-weight:bold;">&#9888; This site is outdated</h2>',
        '<p style="font-size:18px;">This page is no longer maintained and will not receive new updates. ' +
            'For the latest games and news, please visit <strong>' + esc(SITE_NAME) + '</strong> at tumbgames.com.</p>',
        '<p style="margin-top:16px;"><a class="btn btn-warning btn-lg" href="https://www.tumbgames.com/" rel="noopener">' +
            'Go to tumbgames.com <span class="glyphicon glyphicon-chevron-right"></span></a></p>',
        '</div>'
    ].join("\n");
}

function footer(rel) {
    return [
        '<footer>',
        '<div class="row"><div class="col-lg-12">',
        '<p>Copyright &copy; <a href="https://www.tumbgames.com/" rel="noopener">' + esc(SITE_NAME) + '</a> ' +
            new Date().getFullYear() + ' &middot; <a href="' + rel + 'sitemap.xml">Sitemap</a></p>',
        '</div></div>',
        '</footer>'
    ].join("\n");
}

function tail(rel) {
    return [
        '<script src="' + rel + 'js/jquery.js"></scr' + 'ipt>',
        '<script src="' + rel + 'js/bootstrap.min.js"></scr' + 'ipt>',
        '</body>',
        '</html>'
    ].join("\n");
}

// Media block. Videos are lazy: we ship the YouTube poster as a real <img> so
// the crawler (and the user on a slow connection) gets a picture immediately,
// then swap in the iframe on click.
function mediaBlock(item) {
    var alt = esc(decodeEntities(item.name) + " gameplay screenshot");
    if (mediaType(item) === "image") {
        return '<img class="img-responsive" src="' + esc(item.imageURL || item.videoURL) +
            '" alt="' + alt + '" loading="lazy" style="width:100%;height:auto;">';
    }
    var vid = youtubeId(item.videoURL);
    if (!vid) {
        return '<iframe width="100%" height="315" src="' + esc(item.videoURL) +
            '" title="' + alt + '" frameborder="0" allowfullscreen loading="lazy"></iframe>';
    }
    return [
        '<div class="video-embed" data-video="' + esc(vid) + '">',
        '<img class="img-responsive" src="https://i.ytimg.com/vi/' + esc(vid) + '/hqdefault.jpg"',
        ' alt="' + alt + '" width="480" height="360" loading="lazy" style="width:100%;height:auto;">',
        '<span class="video-embed-play" aria-hidden="true">&#9654;</span>',
        '</div>'
    ].join("");
}

function buttonsBlock(item) {
    var html = "";
    (item.buttons || []).forEach(function (b) {
        var label = esc(decodeEntities(b.text));
        if (!b.url) {
            html += '<span class="btn btn-default disabled">' + label + '</span> ';
            return;
        }
        html += '<a class="btn btn-primary" target="_blank" rel="noopener" href="' + esc(b.url) + '">' +
            label + ' <span class="glyphicon glyphicon-chevron-right"></span></a> ';
    });
    return html;
}

/* ------------------------------------------------------------- structured */

function gameJsonLd(item, url) {
    var plats = platforms(item);
    var links = storeLinks(item);
    var node = {
        "@context": "https://schema.org",
        "@type": "VideoGame",
        "name": decodeEntities(item.name),
        "description": decodeEntities(item.description),
        "url": url,
        "image": previewImage(item),
        "applicationCategory": "GameApplication",
        "operatingSystem": plats.join(", "),
        "gamePlatform": plats,
        "author": { "@type": "Organization", "name": SITE_NAME, "url": SITE + "/" },
        "publisher": { "@type": "Organization", "name": SITE_NAME, "url": SITE + "/" },
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock",
            "url": links.android || links.ios || url
        }
    };
    var installs = [links.android, links.ios].filter(Boolean);
    if (installs.length) node.installUrl = installs;

    var vid = youtubeId(item.videoURL);
    if (vid) {
        node.video = {
            "@type": "VideoObject",
            "name": decodeEntities(item.name) + " gameplay trailer",
            "description": decodeEntities(item.description),
            "thumbnailUrl": "https://i.ytimg.com/vi/" + vid + "/maxresdefault.jpg",
            "embedUrl": "https://www.youtube.com/embed/" + vid,
            "uploadDate": "2024-01-01T00:00:00+00:00"
        };
    }

    return [node, {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Games", "item": SITE + "/" },
            { "@type": "ListItem", "position": 2, "name": decodeEntities(item.name), "item": url }
        ]
    }];
}

/* ------------------------------------------------------------------ pages */

function videoScript() {
    return [
        '<style>',
        '.video-embed{position:relative;cursor:pointer;background:#000;}',
        '.video-embed-play{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);',
        'font-size:38px;color:#fff;background:rgba(0,0,0,.55);border-radius:50%;',
        'width:74px;height:74px;line-height:74px;text-align:center;pointer-events:none;}',
        '.video-embed iframe{width:100%;aspect-ratio:16/9;border:0;display:block;}',
        '</style>',
        '<script>',
        'document.addEventListener("click",function(e){',
        'var box=e.target.closest?e.target.closest(".video-embed"):null;',
        'if(!box||!box.dataset.video)return;',
        'var f=document.createElement("iframe");',
        'f.src="https://www.youtube.com/embed/"+box.dataset.video+"?autoplay=1&rel=0";',
        'f.allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture";',
        'f.allowFullscreen=true;f.title="Gameplay video";',
        'box.innerHTML="";box.appendChild(f);box.removeAttribute("data-video");',
        '});',
        '</scr' + 'ipt>'
    ].join("\n");
}

function gamePage(item, all, index) {
    var url = SITE + "/games/" + item.slug + "/";
    var name = decodeEntities(item.name);
    var platLabel = platforms(item).join(" & ");
    var title = name + " - Free " + platLabel + " Game | " + SITE_NAME;
    var desc = clamp("Play " + name + " on " + platLabel + ". " + decodeEntities(item.description), 158);

    // Four neighbouring games, so every page passes crawl signal onward.
    var related = [];
    for (var i = 1; related.length < 4 && i < all.length; i++) {
        related.push(all[(index + i) % all.length]);
    }

    var body = [
        nav("../../"),
        '<div class="container">',
        deprecationBanner(),
        '<ol class="breadcrumb" style="margin-top:20px;">',
        '<li><a href="../../">Games</a></li>',
        '<li class="active">' + esc(name) + '</li>',
        '</ol>',
        '<div class="row"><div class="col-lg-12">',
        '<h1 class="page-header">' + esc(name) + ' <small>' + esc(platLabel) + '</small></h1>',
        '</div></div>',
        '<div class="row">',
        '<div class="col-md-7">' + mediaBlock(item) + '</div>',
        '<div class="col-md-5">',
        '<h2 style="margin-top:0;">About ' + esc(name) + '</h2>',
        '<p>' + esc(decodeEntities(item.description)) + '</p>',
        '<p>' + esc(name) + ' is a free-to-play game by ' + SITE_NAME + ', available on ' +
            esc(platLabel) + '. Download it from the links below and start playing.</p>',
        '<p>' + buttonsBlock(item) + '</p>',
        '</div>',
        '</div>',
        '<hr>',
        '<h2>More games by ' + SITE_NAME + '</h2>',
        '<div class="row">',
        related.map(function (r) {
            return '<div class="col-md-3 col-sm-6" style="margin-bottom:20px;">' +
                '<a href="../' + r.slug + '/">' +
                '<img class="img-responsive" src="' + esc(previewImage(r)) + '" alt="' +
                esc(decodeEntities(r.name)) + '" loading="lazy" style="width:100%;height:auto;"></a>' +
                '<h3 style="font-size:16px;"><a href="../' + r.slug + '/">' +
                esc(decodeEntities(r.name)) + '</a></h3></div>';
        }).join("\n"),
        '</div>',
        '<p><a href="../../">&laquo; Browse all ' + SITE_NAME + ' games</a></p>',
        footer("../../"),
        '</div>'
    ].join("\n");

    return head({
        title: title,
        description: desc,
        canonical: url,
        image: previewImage(item),
        ogType: "article",
        rel: "../../",
        jsonLd: gameJsonLd(item, url)
    }) + "\n" + body + "\n" + videoScript() + "\n" + tail("../../");
}

function indexPage(games) {
    var title = "Free Mobile Games for Android & iOS - Puzzle, Arcade & Casual | " + SITE_NAME;
    var desc = "Browse " + games.length + " free mobile games by " + SITE_NAME +
        ": block puzzle, merge, arcade and casual games for Android and iOS, with gameplay videos and direct store links.";

    var jsonLd = [
        {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": SITE_NAME,
            "alternateName": "TumbGames Game Showroom",
            "url": SITE + "/"
        },
        {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": SITE_NAME,
            "url": SITE + "/",
            "logo": SITE + "/images/icon.png",
            "sameAs": ["https://github.com/" + AUTHOR, "https://www.tumbgames.com/"]
        },
        {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": SITE_NAME + " games",
            "numberOfItems": games.length,
            "itemListElement": games.map(function (g, i) {
                return {
                    "@type": "ListItem",
                    "position": i + 1,
                    "url": SITE + "/games/" + g.slug + "/",
                    "name": decodeEntities(g.name)
                };
            })
        }
    ];

    var cards = games.map(function (item) {
        return [
            '<div class="row">',
            '<div class="col-md-7">' + mediaBlock(item) + '</div>',
            '<div class="col-md-5">',
            '<h2 style="margin-top:0;"><a href="games/' + item.slug + '/">' +
                esc(decodeEntities(item.name)) + '</a></h2>',
            '<h3 style="font-size:16px;color:#777;margin-top:4px;">' +
                esc(platforms(item).join(" & ")) + '</h3>',
            '<p>' + esc(decodeEntities(item.description)) + '</p>',
            '<p>' + buttonsBlock(item) +
                '<a class="btn btn-default" href="games/' + item.slug + '/">Details</a></p>',
            '</div>',
            '</div>',
            '<hr>'
        ].join("\n");
    }).join("\n");

    var body = [
        nav(""),
        '<div class="container">',
        deprecationBanner(),
        '<div class="row"><div class="col-lg-12">',
        '<h1 class="page-header">Free Mobile Games by ' + SITE_NAME + ' <small>Android &amp; iOS</small></h1>',
        '<p class="lead">' + esc(desc) + '</p>',
        '</div></div>',
        '<div id="content">',
        cards,
        '</div>',
        footer(""),
        '</div>'
    ].join("\n");

    return head({
        title: title,
        description: desc,
        canonical: SITE + "/",
        image: SITE + "/images/icon.png",
        rel: "",
        jsonLd: jsonLd
    }) + "\n" + body + "\n" + videoScript() + "\n" + tail("");
}

function sitemap(games) {
    var today = new Date().toISOString().slice(0, 10);
    var urls = [{ loc: SITE + "/", pri: "1.0", freq: "weekly" }];
    games.forEach(function (g) {
        urls.push({ loc: SITE + "/games/" + g.slug + "/", pri: "0.8", freq: "monthly" });
    });
    urls.push({ loc: SITE + "/GooglePlay_privacy_policy.html", pri: "0.2", freq: "yearly" });

    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        urls.map(function (u) {
            return "  <url>\n    <loc>" + u.loc + "</loc>\n    <lastmod>" + today +
                "</lastmod>\n    <changefreq>" + u.freq + "</changefreq>\n    <priority>" +
                u.pri + "</priority>\n  </url>";
        }).join("\n") +
        "\n</urlset>\n";
}

function robots() {
    return [
        "User-agent: *",
        "Allow: /",
        "",
        "# Redirect stubs and game assets - nothing to index",
        "Disallow: /AndroidIosLink.html",
        "Disallow: /EatTheCakeLink.html",
        "Disallow: /TankWarLink.html",
        "Disallow: /TowerDefenseLink.html",
        "Disallow: /ReferGame.html",
        "Disallow: /fdg/",
        "",
        "Sitemap: " + SITE + "/sitemap.xml",
        ""
    ].join("\n");
}

/* ------------------------------------------------------------------- main */

function main() {
    var raw = JSON.parse(fs.readFileSync(path.join(__dirname, "data.json"), "utf8"));

    // Newest entries sit at the end of data.json; the site shows newest first.
    var games = raw.slice().reverse();

    var seen = {};
    games.forEach(function (g) {
        var slug = slugify(g.name) || "game";
        if (seen[slug]) slug = slug + "-" + (++seen[slug]);
        else seen[slug] = 1;
        g.slug = slug;
    });

    fs.writeFileSync(path.join(__dirname, "index.html"), indexPage(games));

    var gamesDir = path.join(__dirname, "games");
    fs.mkdirSync(gamesDir, { recursive: true });
    games.forEach(function (g, i) {
        var dir = path.join(gamesDir, g.slug);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, "index.html"), gamePage(g, games, i));
    });

    fs.writeFileSync(path.join(__dirname, "sitemap.xml"), sitemap(games));
    fs.writeFileSync(path.join(__dirname, "robots.txt"), robots());

    console.log("Built index.html, " + games.length + " game pages, sitemap.xml, robots.txt");
}

main();
