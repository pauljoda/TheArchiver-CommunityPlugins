// Single source of truth for all supported URL patterns.
// Covers all gallery-dl supported sites (~400+).
// Both index.ts and manifest-gen.ts reference this file.

export const urlPatterns: string[] = [
  // ═══════════════════════════════════════════
  // Social Media & Creator Platforms
  // ═══════════════════════════════════════════
  // Twitter / X
  "*.twitter.com",
  "*.x.com",
  "*.nitter.net",
  "*.nitter.it",
  "*.nitter.1d4.us",
  // Instagram
  "*.instagram.com",
  "*.cdninstagram.com",
  // Facebook
  "*.facebook.com",
  // TikTok
  "*.tiktok.com",
  // Pinterest
  "*.pinterest.com",
  "*.pinterest.co.uk",
  "*.pinterest.de",
  "*.pinterest.fr",
  "*.pinterest.ca",
  "*.pinterest.jp",
  "*.pin.it",
  // Tumblr
  "*.tumblr.com",
  // Reddit
  "*.reddit.com",
  "*.redd.it",
  "*.old.reddit.com",
  // Bluesky
  "*.bsky.app",
  "*.bsky.social",
  // Mastodon (common instances)
  "*.mastodon.social",
  "*.mastodon.online",
  "*.mstdn.social",
  "*.mas.to",
  "*.pawoo.net",
  "*.baraag.net",
  // Misskey instances
  "*.misskey.io",
  "*.misskey.art",
  // Plurk
  "*.plurk.com",
  // VK
  "*.vk.com",
  "*.vk.ru",
  // Weibo
  "*.weibo.com",
  "*.weibo.cn",

  // ═══════════════════════════════════════════
  // Art Communities
  // ═══════════════════════════════════════════
  // Pixiv
  "*.pixiv.net",
  "*.pximg.net",
  // DeviantArt
  "*.deviantart.com",
  "*.sta.sh",
  // ArtStation
  "*.artstation.com",
  // Newgrounds
  "*.newgrounds.com",
  // Fur Affinity
  "*.furaffinity.net",
  // Inkbunny
  "*.inkbunny.net",
  // Weasyl
  "*.weasyl.com",
  // Itaku
  "*.itaku.ee",
  // Piczel
  "*.piczel.tv",
  // Poipiku
  "*.poipiku.com",
  // Skeb
  "*.skeb.jp",
  // Behance
  "*.behance.net",
  // 500px
  "*.500px.com",
  // Flickr
  "*.flickr.com",
  // VSCO
  "*.vsco.co",
  // Unsplash
  "*.unsplash.com",
  // WikiArt
  "*.wikiart.org",
  // foriio
  "*.fori.io",
  // Xfolio
  "*.xfolio.jp",
  // Pillowfort
  "*.pillowfort.social",
  // SmugMug
  "*.smugmug.com",

  // ═══════════════════════════════════════════
  // Patreon / Creator Support Platforms
  // ═══════════════════════════════════════════
  "*.patreon.com",
  "*.fanbox.cc",
  "*.fantia.jp",
  "*.kemono.su",
  "*.coomer.su",
  "*.boosty.to",
  "*.subscribestar.com",
  "*.subscribestar.adult",
  "*.fansly.com",
  "*.ci-en.net",
  "*.ci-en.dlsite.com",
  "*.gumroad.com",

  // ═══════════════════════════════════════════
  // Imageboards / Boorus
  // ═══════════════════════════════════════════
  // Danbooru
  "*.danbooru.donmai.us",
  "*.safebooru.donmai.us",
  "*.testbooru.donmai.us",
  "*.aibooru.online",
  // Gelbooru
  "*.gelbooru.com",
  // Safebooru (gelbooru-based)
  "*.safebooru.org",
  // Rule34
  "*.rule34.xxx",
  "*.rule34.us",
  "*.rule34.paheal.net",
  "*.rule34.world",
  "*.rule34.xyz",
  // Sankaku
  "*.sankakucomplex.com",
  "*.chan.sankakucomplex.com",
  "*.idol.sankakucomplex.com",
  "*.beta.sankakucomplex.com",
  // Yande.re / Konachan (Moebooru)
  "*.yande.re",
  "*.konachan.com",
  "*.konachan.net",
  // e621 / e926
  "*.e621.net",
  "*.e926.net",
  // Zerochan
  "*.zerochan.net",
  // Realbooru
  "*.realbooru.com",
  // 3dbooru
  "*.behoimi.org",
  // Nozomi.la
  "*.nozomi.la",
  // Derpibooru / Philomena
  "*.derpibooru.org",
  "*.trixiebooru.org",
  "*.ponybooru.org",
  "*.furbooru.org",
  "*.twibooru.org",
  // Szurubooru instances
  "*.booru.io",
  // Shimmie2 instances
  "*.shimmie2.shishnet.org",
  // AGNPH
  "*.agn.ph",
  // R34 Vault
  "*.r34vault.com",
  // Lolibooru
  "*.lolibooru.moe",
  // ATFBooru
  "*.booru.allthefallen.moe",
  // Hypnohub
  "*.hypnohub.net",
  // Tbib
  "*.tbib.org",
  // Xbooru
  "*.xbooru.com",
  // BooruVar
  "*.booruvar.com",

  // ═══════════════════════════════════════════
  // Manga / Comic Readers
  // ═══════════════════════════════════════════
  "*.mangadex.org",
  "*.mangapark.net",
  "*.mangapark.com",
  "*.mangareader.to",
  "*.mangafire.to",
  "*.mangafreak.net",
  "*.mangahere.cc",
  "*.mangafox.me",
  "*.mangatown.com",
  "*.mangakakalot.com",
  "*.manganato.com",
  "*.mangabuddy.com",
  "*.mangasee123.com",
  "*.mangalife.us",
  "*.comick.io",
  "*.comick.cc",
  "*.dynasty-scans.com",
  "*.hentai2read.com",
  "*.hiperdex.com",
  "*.readcomiconline.li",
  "*.tcbscans.me",
  "*.tcbscans.com",
  "*.webtoons.com",
  "*.webtoon.xyz",
  "*.comic.naver.com",
  "*.tapas.io",
  "*.bato.to",
  "*.batoto.org",
  "*.mangapill.com",
  "*.manhuaplus.com",
  "*.manhuascan.us",
  "*.toonily.com",
  "*.asurascans.com",
  "*.asuratoon.com",
  "*.reaperscans.com",
  "*.flamescans.org",
  "*.luminousscans.com",
  "*.leviatanscans.com",
  "*.mangatx.com",
  "*.manhuaus.com",
  "*.isekaiscan.com",

  // ═══════════════════════════════════════════
  // NSFW / Adult
  // ═══════════════════════════════════════════
  // ExHentai / E-Hentai
  "*.exhentai.org",
  "*.e-hentai.org",
  // Luscious
  "*.luscious.net",
  // EroMe
  "*.erome.com",
  // Pornhub
  "*.pornhub.com",
  // xHamster
  "*.xhamster.com",
  "*.xhamster2.com",
  "*.xhamster3.com",
  // RedGIFs
  "*.redgifs.com",
  // HentaiFoundry
  "*.hentai-foundry.com",
  // Nijie
  "*.nijie.info",
  // Horne
  "*.horne.red",
  // Nhentai
  "*.nhentai.net",
  // Hitomi.la
  "*.hitomi.la",
  // IMHentai
  "*.imhentai.xxx",
  "*.hentaifox.com",
  "*.hentaienvy.com",
  "*.hentaizap.com",
  "*.hentaihere.com",
  "*.myhentaigallery.com",
  "*.hentaiera.com",
  "*.hentairox.com",
  // Pururin
  "*.pururin.to",
  // Tsumino
  "*.tsumino.com",
  // 8Muses
  "*.8muses.com",
  // Simply-Hentai
  "*.simply-hentai.com",
  // Hentai Cafe
  "*.hentai.cafe",
  // Multporn
  "*.multporn.net",
  // Aryion (Eka's Portal)
  "*.aryion.com",
  // Hentai Nexus
  "*.hentainexus.com",
  // Koharu / HentaiNexus
  "*.koharu.to",
  // Manga18
  "*.manga18.us",
  // Coomer
  "*.coomer.party",
  // Scrolller
  "*.scrolller.com",

  // ═══════════════════════════════════════════
  // Image Hosting
  // ═══════════════════════════════════════════
  "*.imgur.com",
  "*.i.imgur.com",
  "*.imagebam.com",
  "*.imagefap.com",
  "*.imgbb.com",
  "*.ibb.co",
  "*.imgbox.com",
  "*.catbox.moe",
  "*.files.catbox.moe",
  "*.litter.catbox.moe",
  "*.pixeldrain.com",
  "*.cyberdrop.me",
  "*.cyberdrop.to",
  "*.bunkr.si",
  "*.bunkr.su",
  "*.bunkr.ru",
  "*.bunkrr.su",
  "*.gofile.io",
  "*.lensdump.com",
  "*.postimg.cc",
  "*.postimages.org",
  "*.directlink.cc",
  "*.imgth.com",
  "*.turboimagehost.com",
  "*.uploadir.com",
  "*.picclick.com",
  "*.pic.re",
  "*.imgchest.com",
  "*.jpg.church",
  "*.jpg.fish",
  "*.jpg.pet",
  "*.jpg.homes",
  "*.saint.to",
  "*.img.kiwi",
  "*.photobucket.com",

  // ═══════════════════════════════════════════
  // Chan / Boards / Archives
  // ═══════════════════════════════════════════
  "*.4chan.org",
  "*.4channel.org",
  "*.boards.4chan.org",
  "*.i.4cdn.org",
  "*.8kun.top",
  "*.8chan.moe",
  "*.4plebs.org",
  "*.archived.moe",
  "*.archiveofsins.com",
  "*.desuarchive.org",
  "*.warosu.org",
  "*.thebarchive.com",
  "*.fireden.net",
  "*.foolz.us",
  "*.rebeccablacktech.com",
  "*.archive.alice.al",

  // ═══════════════════════════════════════════
  // Photography / Stock
  // ═══════════════════════════════════════════
  "*.wallhaven.cc",
  "*.wallpaperflare.com",
  "*.alphacoders.com",
  "*.pexels.com",
  "*.wallpapers.com",

  // ═══════════════════════════════════════════
  // Model / AI Art Platforms
  // ═══════════════════════════════════════════
  "*.civitai.com",

  // ═══════════════════════════════════════════
  // Miscellaneous
  // ═══════════════════════════════════════════
  // Discord
  "*.discord.com",
  "*.discordapp.com",
  // Blogger / Blogspot
  "*.blogspot.com",
  "*.blogger.com",
  // WordPress
  "*.wordpress.com",
  // Wikimedia / Wikipedia
  "*.wikimedia.org",
  "*.wikipedia.org",
  "*.commons.wikimedia.org",
  // Giphy
  "*.giphy.com",
  // Tenor
  "*.tenor.com",
  // Imgur alternatives / lolisafe instances
  "*.zz.ht",
  "*.uguu.se",
  // XenForo forums
  "*.xenforo.com",
  // jsChan boards
  "*.8chan.se",
  // LynxChan boards
  "*.endchan.net",
  "*.endchan.org",
  // Foolfuuka archives
  "*.rbt.asia",
  // Shopify stores (generic)
  "*.myshopify.com",
  // URL shorteners (gallery-dl can follow these)
  "*.t.co",
  "*.bit.ly",
  "*.goo.gl",
  "*.tinyurl.com",
  // Naver
  "*.blog.naver.com",
  "*.post.naver.com",
  // Mangoxo
  "*.mangoxo.com",
  // Madokami
  "*.manga.madokami.al",
  // Livedoor
  "*.blog.livedoor.jp",
  // Seiga (Niconico)
  "*.seiga.nicovideo.jp",
  // Hentai Cosplay
  "*.hentai-cosplays.com",
  // SimpleHentai
  "*.simplyhentai.org",
  // WeasylDEV
  "*.dev.weasyl.com",
  // Picarto
  "*.picarto.tv",
  // Toyhouse
  "*.toyhou.se",
  // Folio
  "*.portfolio.pixiv.net",
  // FurPlanet
  "*.furplanet.com",
  // SoFurry
  "*.sofurry.com",
  // Cara
  "*.cara.app",
  // Kemono Friends
  "*.kemono.party",
  // Imgbb
  "*.imgbb.org",

  // Additional gallery-dl upstream hosts synced from supportedsites.md
  "*.2ch.org",
  "*.35photo.pro",
  "*.4archive.org",
  "*.4chanarchives.com",
  "*.comics.8muses.com",
  "*.myportfolio.com",
  "*.adultempire.com",
  "*.ahottie.top",
  "*.allporncomic.com",
  "*.arca.live",
  "*.architizer.com",
  "*.archiveofourown.org",
  "*.are.na",
  "*.audiochan.com",
  "*.bbc.co.uk",
  "*.bellazon.com",
  "*.bilibili.com",
  "*.booth.pm",
  "*.cfake.com",
  "*.chzzk.naver.com",
  "*.comedywildlifephoto.com",
  "*.comicvine.gamespot.com",
  "*.coomer.st",
  "*.cyberdrop.cr",
  "*.cyberfile.me",
  "*.dandadan.net",
  "*.danke.moe",
  "*.desktopography.net",
  "*.eporner.com",
  "*.everia.club",
  "*.fapachi.com",
  "*.fapello.com",
  "*.fikfap.com",
  "*.filester.me",
  "*.fitnakedgirls.com",
  "*.foriio.com",
  "*.furry34.com",
  "*.fuskator.com",
  "*.2chan.net",
  "*.girlswithmuscle.com",
  "*.girlsreleased.com",
  "*.hatenablog.com",
  "*.hotleak.vip",
  "*.idolcomplex.com",
  "*.imagepond.net",
  "*.imageshack.com",
  "*.imgpile.com",
  "*.issuu.com",
  "*.itch.io",
  "*.iwara.tv",
  "*.joyreactor.com",
  "*.kaliscan.me",
  "*.keenspot.com",
  "*.kemono.cr",
  "*.downloads.khinsider.com",
  "*.komikcast.li",
  "*.koofr.net",
  "*.leakgallery.com",
  "*.lexica.art",
  "*.lightroom.adobe.com",
  "*.listal.com",
  "*.lofter.com",
  "*.members.luscious.net",
  "*.fanfox.net",
  "*.ww2.mangafreak.me",
  "*.mangaread.org",
  "*.mangataro.org",
  "*.mixdrop.ag",
  "*.motherless.com",
  "*.nekohouse.su",
  "*.nsfwalbum.com",
  "*.nudostar.tv",
  "*.ok.porn",
  "*.pholder.com",
  "*.vogue.com",
  "*.picazor.com",
  "*.pictoa.com",
  "*.pixnet.net",
  "*.poringa.net",
  "*.pornpics.com",
  "*.pornstars.tube",
  "*.rule34vault.com",
  "*.rawkuma.net",
  "*.s3nd.pics",
  "*.sankaku.app",
  "*.news.sankakucomplex.com",
  "*.scatbooru.co.uk",
  "*.raw.senmanga.com",
  "*.sex.com",
  "*.sizebooru.com",
  "*.slickpic.com",
  "*.slideshare.net",
  "*.soundgasm.net",
  "*.speakerdeck.com",
  "*.steamgriddb.com",
  "*.sxypix.com",
  "*.telegra.ph",
  "*.thehentaiworld.com",
  "*.thefap.net",
  "*.tmohentai.com",
  "*.tumblrgallery.xyz",
  "*.tungsten.run",
  "*.turbo.cr",
  "*.urlgalleries.com",
  "*.vipergirls.to",
  "*.wallpapercave.com",
  "*.webmshare.com",
  "*.weebcentral.com",
  "*.weebdex.org",
  "*.whyp.it",
  "*.wikifeet.com",
  "*.wikifeetx.com",
  "*.xasiat.com",
  "*.xvideos.com",
  "*.yiffverse.com",
  "*.yourlesbians.com",
  "*.kabe-uchiroom.com",
  "*.vanilla-rock.com",
  "*.sturdychan.help",
  "*.schan.help",
  "*.jpg7.cr",
  "*.imglike.com",
  "*.booru.borvar.art",
  "*.e6ai.net",
  "*.the-collection.booru.org",
  "*.illusioncards.booru.org",
  "*.allgirl.booru.org",
  "*.drawfriends.booru.org",
  "*.vidyart2.booru.org",
  "*.hentai-cosplay-xxx.com",
  "*.hentai-img-xxx.com",
  "*.porn-image.com",
  "*.94chan.org",
  "*.bbw-chan.link",
  "*.kohlchan.net",
  "*.nelomanga.net",
  "*.natomanga.com",
  "*.manganato.gg",
  "*.mangakakalot.gg",
  "*.misskey.design",
  "*.lesbian.energy",
  "*.sushi.ski",
  "*.nitter.space",
  "*.nitter.tiekoetter",
  "*.xcancel.com",
  "*.lightbrd.com",
  "*.raddle.me",
  "*.reactor.cc",
  "*.pornreactor.cc",
  "*.thatpervert.com",
  "*.booru.cavemanon.xyz",
  "*.rule34hentai.net",
  "*.vidya.pics",
  "*.noz.rip",
  "*.co.llection.pics",
  "*.soybooru.com",
  "*.booru.bcbnsfw.space",
  "*.snootbooru.com",
  "*.visuabusters.com",
  "*.smuglo.li",
  "*.boards.guro.cx",
  "*.species.wikimedia.org",
  "*.mediawiki.org",
  "*.fandom.com",
  "*.wiki.gg",
  "*.mariowiki.com",
  "*.bulbapedia.bulbagarden.net",
  "*.pidgi.net",
  "*.azurlane.koumakan.jp",
  "*.mgewiki.moe",
  "*.simpcity.cr",
  "*.nudostar.com",
  "*.allthefallen.moe",
  "*.celebforum.to",
  "*.titsintops.com",
  "*.forums.socialmediagirls.com",
  "*.blacktowhite.net",
  "*.sakugabooru.com",
  "*.archive.4plebs.org",
  "*.arch.b4k.dev",
  "*.boards.fireden.net",
  "*.archive.palanq.win",
  "*.chelseacrew.com",
  "*.fashionnova.com",
  "*.loungeunderwear.com",
  "*.michaels.com.au",
  "*.modcloth.com",
  "*.ohpolly.com",
  "*.omgmiamiswimwear.com",
  "*.pinupgirlclothing.com",
  "*.raidlondon.com",
  "*.unique-vintage.com",
  "*.windsorstore.com",
  "*.acidimg.cc",
  "*.fappic.com",
  "*.imagetwist.com",
  "*.imagevenue.com",
  "*.imgadult.com",
  "*.imgclick.net",
  "*.imgdrive.net",
  "*.imgpv.com",
  "*.imgspice.com",
  "*.imgtaxi.com",
  "*.imgwallet.com",
  "*.imx.to",
  "*.picstate.com",
  "*.pixhost.to",
  "*.silverpic.net",
  "*.vipr.im",
];

// Site options for the site-directory-map setting.
// Each entry allows users to assign a download folder to a specific domain.
export const siteOptions = [
  // Social Media
  { label: "Twitter / X", value: "twitter.com" },
  { label: "Instagram", value: "instagram.com" },
  { label: "Facebook", value: "facebook.com" },
  { label: "TikTok", value: "tiktok.com" },
  { label: "Pinterest", value: "pinterest.com" },
  { label: "Tumblr", value: "tumblr.com" },
  { label: "Reddit", value: "reddit.com" },
  { label: "Bluesky", value: "bsky.app" },
  { label: "Mastodon", value: "mastodon.social" },
  { label: "Weibo", value: "weibo.com" },
  { label: "VK", value: "vk.com" },

  // Art Communities
  { label: "Pixiv", value: "pixiv.net" },
  { label: "DeviantArt", value: "deviantart.com" },
  { label: "ArtStation", value: "artstation.com" },
  { label: "Newgrounds", value: "newgrounds.com" },
  { label: "Fur Affinity", value: "furaffinity.net" },
  { label: "Inkbunny", value: "inkbunny.net" },
  { label: "Weasyl", value: "weasyl.com" },
  { label: "Itaku", value: "itaku.ee" },
  { label: "Behance", value: "behance.net" },
  { label: "500px", value: "500px.com" },
  { label: "Flickr", value: "flickr.com" },
  { label: "VSCO", value: "vsco.co" },
  { label: "Unsplash", value: "unsplash.com" },
  { label: "WikiArt", value: "wikiart.org" },
  { label: "SmugMug", value: "smugmug.com" },
  { label: "Skeb", value: "skeb.jp" },
  { label: "Poipiku", value: "poipiku.com" },

  // Creator Platforms
  { label: "Patreon", value: "patreon.com" },
  { label: "Fanbox (pixivFANBOX)", value: "fanbox.cc" },
  { label: "Fantia", value: "fantia.jp" },
  { label: "Kemono", value: "kemono.su" },
  { label: "Coomer", value: "coomer.su" },
  { label: "Boosty", value: "boosty.to" },
  { label: "SubscribeStar", value: "subscribestar.com" },
  { label: "Fansly", value: "fansly.com" },
  { label: "Ci-en", value: "ci-en.net" },
  { label: "Gumroad", value: "gumroad.com" },

  // Boorus / Imageboards
  { label: "Danbooru", value: "danbooru.donmai.us" },
  { label: "Gelbooru", value: "gelbooru.com" },
  { label: "Safebooru", value: "safebooru.org" },
  { label: "Rule34.xxx", value: "rule34.xxx" },
  { label: "Rule34.paheal", value: "rule34.paheal.net" },
  { label: "Sankaku Channel", value: "sankakucomplex.com" },
  { label: "Yande.re", value: "yande.re" },
  { label: "Konachan", value: "konachan.com" },
  { label: "e621", value: "e621.net" },
  { label: "Zerochan", value: "zerochan.net" },
  { label: "Derpibooru", value: "derpibooru.org" },
  { label: "Realbooru", value: "realbooru.com" },

  // Manga / Comics
  { label: "MangaDex", value: "mangadex.org" },
  { label: "MangaPark", value: "mangapark.net" },
  { label: "MangaReader", value: "mangareader.to" },
  { label: "Comick", value: "comick.io" },
  { label: "Dynasty Scans", value: "dynasty-scans.com" },
  { label: "WEBTOON", value: "webtoons.com" },
  { label: "Tapas", value: "tapas.io" },
  { label: "Bato.to", value: "bato.to" },
  { label: "MangaFire", value: "mangafire.to" },

  // NSFW
  { label: "ExHentai", value: "exhentai.org" },
  { label: "E-Hentai", value: "e-hentai.org" },
  { label: "nhentai", value: "nhentai.net" },
  { label: "Hitomi.la", value: "hitomi.la" },
  { label: "IMHentai", value: "imhentai.xxx" },
  { label: "HentaiFox", value: "hentaifox.com" },
  { label: "HentaiEnvy", value: "hentaienvy.com" },
  { label: "HentaiZap", value: "hentaizap.com" },
  { label: "HentaiHere", value: "hentaihere.com" },
  { label: "My Hentai Gallery", value: "myhentaigallery.com" },
  { label: "HentaiEra", value: "hentaiera.com" },
  { label: "HentaiRox", value: "hentairox.com" },
  { label: "Luscious", value: "luscious.net" },
  { label: "EroMe", value: "erome.com" },
  { label: "RedGIFs", value: "redgifs.com" },
  { label: "HentaiFoundry", value: "hentai-foundry.com" },
  { label: "Nijie", value: "nijie.info" },
  { label: "8Muses", value: "8muses.com" },

  // Image Hosting
  { label: "Imgur", value: "imgur.com" },
  { label: "ImageFap", value: "imagefap.com" },
  { label: "imgbox", value: "imgbox.com" },
  { label: "Catbox", value: "catbox.moe" },
  { label: "Pixeldrain", value: "pixeldrain.com" },
  { label: "Cyberdrop", value: "cyberdrop.me" },
  { label: "Bunkr", value: "bunkr.si" },
  { label: "Gofile", value: "gofile.io" },
  { label: "PostImages", value: "postimg.cc" },

  // Chan / Archives
  { label: "4chan", value: "4chan.org" },
  { label: "8kun", value: "8kun.top" },
  { label: "Archived.moe", value: "archived.moe" },
  { label: "Desuarchive", value: "desuarchive.org" },
  { label: "4plebs", value: "4plebs.org" },

  // Photography / Wallpapers
  { label: "Wallhaven", value: "wallhaven.cc" },
  { label: "Civitai", value: "civitai.com" },

  // Misc
  { label: "Discord", value: "discord.com" },
  { label: "Blogger/Blogspot", value: "blogspot.com" },
];
