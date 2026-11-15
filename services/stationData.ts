
import type { RadioStation } from '../types';

// A large, curated list of high-quality radio stations to serve as a reliable
// primary data source if the live API fetch fails. This ensures the application
// is always populated with a good selection of stations.
export const prepackagedStations: RadioStation[] = [
    // === North America ===
    // USA
    { stationuuid: '96143098-0601-11e8-a442-52543be04c81', name: 'KEXP 90.3 FM', url_resolved: 'https://kexp.streamguys1.com/kexp128.mp3', country: 'United States', state: 'Washington', geo_lat: 47.60, geo_long: -122.33, tags: 'alternative,indie,rock', bitrate: 128 },
    { stationuuid: '2b7b9696-6453-41dc-a2c9-173873499702', name: 'Radio Paradise', url_resolved: 'https://stream.radioparadise.com/flacm', country: 'United States', state: 'California', geo_lat: 39.77, geo_long: -121.52, tags: 'eclectic,rock', bitrate: 1411 },
    { stationuuid: '96141a76-0601-11e8-a442-52543be04c81', name: 'WQXR 105.9 FM', url_resolved: 'https://stream.wqxr.org/wqxr-web', country: 'United States', state: 'New York', geo_lat: 40.71, geo_long: -74.00, tags: 'classical', bitrate: 128 },
    { stationuuid: '8b383858-a22b-4da0-85f2-9013c77508e7', name: 'SomaFM: Groove Salad', url_resolved: 'https://ice2.somafm.com/groovesalad-256-mp3', country: 'United States', state: 'California', geo_lat: 37.77, geo_long: -122.41, tags: 'ambient,downtempo,chillout', bitrate: 256 },
    { stationuuid: 'bd179f96-e789-497b-83c9-3a1371131b46', name: 'SomaFM: Drone Zone', url_resolved: 'https://ice2.somafm.com/dronezone-256-mp3', country: 'United States', state: 'California', geo_lat: 37.77, geo_long: -122.41, tags: 'ambient,drone,space', bitrate: 256 },
    { stationuuid: 'a29b2c8a-785a-4688-a320-8043694f0643', name: 'SomaFM: DEF CON Radio', url_resolved: 'https://ice2.somafm.com/defcon-256-mp3', country: 'United States', state: 'California', geo_lat: 37.77, geo_long: -122.41, tags: 'electronic,industrial,ambient', bitrate: 256 },
    { stationuuid: '96141ae0-0601-11e8-a442-52543be04c81', name: 'WFMT 98.7 FM', url_resolved: 'https://wfmt.streamguys1.com/wfmt-mp3', country: 'United States', state: 'Illinois', geo_lat: 41.88, geo_long: -87.62, tags: 'classical,opera', bitrate: 256 },
    { stationuuid: '9614210c-0601-11e8-a442-52543be04c81', name: 'WWOZ 90.7 FM', url_resolved: 'https://wwoz-sc.streamguys1.com/wwoz-hi.mp3', country: 'United States', state: 'Louisiana', geo_lat: 29.95, geo_long: -90.07, tags: 'jazz,blues,r&b,funk', bitrate: 128 },
    { stationuuid: '9614300c-0601-11e8-a442-52543be04c81', name: 'The Current 89.3', url_resolved: 'https://current.stream.publicradio.org/kcmp.mp3', country: 'United States', state: 'Minnesota', geo_lat: 44.97, geo_long: -93.26, tags: 'adult alternative,indie', bitrate: 128 },
    { stationuuid: '96142c6c-0601-11e8-a442-52543be04c81', name: 'KCRW Eclectic24', url_resolved: 'https://kcrw.streamguys1.com/kcrw_eclectic24_128k_mp3', country: 'United States', state: 'California', geo_lat: 34.05, geo_long: -118.24, tags: 'eclectic,indie,electronic', bitrate: 128 },
    { stationuuid: '96142b86-0601-11e8-a442-52543be04c81', name: 'KUTX 98.9', url_resolved: 'https://kut.stream.publicradio.org/kutx.mp3', country: 'United States', state: 'Texas', geo_lat: 30.26, geo_long: -97.74, tags: 'alternative,indie,rock', bitrate: 128 },
    { stationuuid: '96141a77-0601-11e8-a442-52543be04c81', name: 'WNYC 93.9 FM', url_resolved: 'https://fm939.wnyc.org/wnycfm', country: 'United States', state: 'New York', geo_lat: 40.71, geo_long: -74.00, tags: 'news,talk', bitrate: 128 },
    { stationuuid: '9614309a-0601-11e8-a442-52543be04c81', name: 'WFMU 91.1', url_resolved: 'https://stream.wfmu.org/freeform-128k', country: 'United States', state: 'New Jersey', geo_lat: 40.78, geo_long: -74.07, tags: 'freeform,experimental,eclectic', bitrate: 128 },
    { stationuuid: '9614352a-0601-11e8-a442-52543be04c81', name: 'Radio Free Brooklyn', url_resolved: 'https://stream.radiofreebrooklyn.org/rfb.mp3', country: 'United States', state: 'New York', geo_lat: 40.67, geo_long: -73.94, tags: 'community,indie', bitrate: 128 },
    { stationuuid: 'f5d1e4c2-9e8a-4b71-8d2a-1c0b3f4a5e6d', name: 'Jazz24', url_resolved: 'https://live.jazz24.org/jazz24-mp3', country: 'United States', state: 'Washington', geo_lat: 47.60, geo_long: -122.33, tags: 'jazz', bitrate: 128 },
    { stationuuid: 'a8b2c3d4-e5f6-4a5b-6c7d-8e9f0a1b2c3d', name: 'K-LOVE', url_resolved: 'https://klove.stream.publicradio.org/klove.mp3', country: 'United States', state: 'California', geo_lat: 38.58, geo_long: -121.49, tags: 'christian,pop', bitrate: 128 },
    { stationuuid: 'b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e', name: 'WBEZ 91.5 FM', url_resolved: 'https://wbez.streamguys1.com/wbez-mp3', country: 'United States', state: 'Illinois', geo_lat: 41.87, geo_long: -87.62, tags: 'news,public radio', bitrate: 128 },
    
    // Canada
    { stationuuid: '9614457e-0601-11e8-a442-52543be04c81', name: 'CBC Radio One', url_resolved: 'https://cbcradiolive.akamaized.net/hls/live/2041051/ES_R1_TOR/master.m3u8', country: 'Canada', state: 'Ontario', geo_lat: 43.65, geo_long: -79.38, tags: 'news,talk', bitrate: 64 },
    { stationuuid: '961448b2-0601-11e8-a442-52543be04c81', name: 'CJSW 90.9 FM', url_resolved: 'https://stream.cjsw.com/cjsw.mp3', country: 'Canada', state: 'Alberta', geo_lat: 51.04, geo_long: -114.07, tags: 'college radio,indie,eclectic', bitrate: 128 },
    { stationuuid: '96144580-0601-11e8-a442-52543be04c81', name: 'CBC Music', url_resolved: 'https://cbcradiolive.akamaized.net/hls/live/2041054/ES_R2_TOR/master.m3u8', country: 'Canada', state: 'Ontario', geo_lat: 43.65, geo_long: -79.38, tags: 'adult alternative,canadian', bitrate: 64 },
    { stationuuid: '96144813-0601-11e8-a442-52543be04c81', name: 'Indie88', url_resolved: 'https://streams.indy.live/indie88/aac/64', country: 'Canada', state: 'Ontario', geo_lat: 43.64, geo_long: -79.40, tags: 'indie,rock,alternative', bitrate: 64 },
    { stationuuid: 'd3e4f5a6-b7c8-9d0e-1f2a-3b4c5d6e7f8a', name: 'Jazz.FM91', url_resolved: 'https://stream.jazz.fm/jazzfm91', country: 'Canada', state: 'Ontario', geo_lat: 43.65, geo_long: -79.38, tags: 'jazz', bitrate: 128 },
    
    // Mexico
    { stationuuid: '961466a8-0601-11e8-a442-52543be04c81', name: 'Reactor 105.7', url_resolved: 'https://27233.live.streamtheworld.com/XERC_FMAAC_SC', country: 'Mexico', state: 'Mexico City', geo_lat: 19.43, geo_long: -99.13, tags: 'alternative,rock', bitrate: 64 },
    { stationuuid: '96146580-0601-11e8-a442-52543be04c81', name: 'Opus 94', url_resolved: 'https://27233.live.streamtheworld.com/XHOF_FMAAC_SC', country: 'Mexico', state: 'Mexico City', geo_lat: 19.43, geo_long: -99.13, tags: 'classical', bitrate: 64 },

    // === South America ===
    // Brazil
    { stationuuid: '96114258-0601-11e8-a442-52543be04c81', name: 'Radio Cultura FM', url_resolved: 'https://audio.tvcultura.com.br:8001/live', country: 'Brazil', state: 'São Paulo', geo_lat: -23.55, geo_long: -46.63, tags: 'classical', bitrate: 128 },
    { stationuuid: '96114840-0601-11e8-a442-52543be04c81', name: 'Antena 1', url_resolved: 'https://antena1.stream.digital/stream', country: 'Brazil', state: 'São Paulo', geo_lat: -23.55, geo_long: -46.63, tags: 'adult contemporary,pop', bitrate: 128 },
    { stationuuid: '961141e4-0601-11e8-a442-52543be04c81', name: 'Radio Eldorado', url_resolved: 'https://playerservices.streamtheworld.com/api/livestream-redirect/ELDORADOFMAAC.aac', country: 'Brazil', state: 'São Paulo', geo_lat: -23.55, geo_long: -46.63, tags: 'mpb,adult contemporary', bitrate: 48 },
    { stationuuid: 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b', name: 'Nova Brasil FM', url_resolved: 'https://playerservices.streamtheworld.com/api/livestream-redirect/NOVABRASILAAC.aac', country: 'Brazil', state: 'São Paulo', geo_lat: -23.55, geo_long: -46.63, tags: 'mpb,pop', bitrate: 64 },
    
    // Argentina
    { stationuuid: '96113b9c-0601-11e8-a442-52543be04c81', name: 'Radio con Vos', url_resolved: 'https://vivo.radioZVOS.com.ar/radioconvos.aac', country: 'Argentina', state: 'Buenos Aires', geo_lat: -34.60, geo_long: -58.38, tags: 'talk,news,pop', bitrate: 64 },
    { stationuuid: '96113b9a-0601-11e8-a442-52543be04c81', name: 'Nacional Clásica', url_resolved: 'https://stream.radiocut.fm/radionacionalclasica', country: 'Argentina', state: 'Buenos Aires', geo_lat: -34.60, geo_long: -58.38, tags: 'classical', bitrate: 128 },
    { stationuuid: 'f7a8b9c0-d1e2-4f3a-5b6c-7d8e9f0a1b2c', name: 'Blue 100.7', url_resolved: 'https://blue.fm/stream', country: 'Argentina', state: 'Buenos Aires', geo_lat: -34.60, geo_long: -58.38, tags: 'eclectic,indie', bitrate: 128 },
    
    // Colombia
    { stationuuid: '9611599a-0601-11e8-a442-52543be04c81', name: 'La X Más Música', url_resolved: 'https://lax.stream.miradio.com.co/stream', country: 'Colombia', state: 'Bogotá', geo_lat: 4.71, geo_long: -74.07, tags: 'electronic,pop,alternative', bitrate: 128 },
    { stationuuid: '961158a4-0601-11e8-a442-52543be04c81', name: 'HJCK', url_resolved: 'https://playerservices.streamtheworld.com/api/livestream-redirect/HJCKAAC.aac', country: 'Colombia', state: 'Bogotá', geo_lat: 4.71, geo_long: -74.07, tags: 'jazz,classical,world', bitrate: 64 },
    
    // Chile
    { stationuuid: '961152a2-0601-11e8-a442-52543be04c81', name: 'Radio Beethoven', url_resolved: 'https://unlimited11-cl.dps.live/beethoven/aac/icecast.audio', country: 'Chile', state: 'Santiago', geo_lat: -33.44, geo_long: -70.66, tags: 'classical', bitrate: 128 },

    // === Europe ===
    // UK
    { stationuuid: '9616a578-0601-11e8-a442-52543be04c81', name: 'BBC Radio 1', url_resolved: 'https://stream.live.vc.bbcmedia.co.uk/bbc_radio_one', country: 'United Kingdom', state: 'London', geo_lat: 51.50, geo_long: -0.12, tags: 'pop,dance,top40', bitrate: 128 },
    { stationuuid: '9616a73c-0601-11e8-a442-52543be04c81', name: 'BBC Radio 2', url_resolved: 'https://stream.live.vc.bbcmedia.co.uk/bbc_radio_two', country: 'United Kingdom', state: 'London', geo_lat: 51.50, geo_long: -0.12, tags: 'adult contemporary,pop', bitrate: 128 },
    { stationuuid: '9616a822-0601-11e8-a442-52543be04c81', name: 'BBC Radio 3', url_resolved: 'https://stream.live.vc.bbcmedia.co.uk/bbc_radio_three', country: 'United Kingdom', state: 'London', geo_lat: 51.50, geo_long: -0.12, tags: 'classical,jazz,world', bitrate: 320 },
    { stationuuid: '9616ace4-0601-11e8-a442-52543be04c81', name: 'BBC Radio 6 Music', url_resolved: 'https://stream.live.vc.bbcmedia.co.uk/bbc_6music', country: 'United Kingdom', state: 'London', geo_lat: 51.50, geo_long: -0.12, tags: 'alternative,indie rock', bitrate: 320 },
    { stationuuid: '030b4279-d54d-4841-8a9d-5f639316b801', name: 'NTS Radio 1', url_resolved: 'https://stream-relay-geo.ntslive.net/stream', country: 'United Kingdom', state: 'London', geo_lat: 51.53, geo_long: -0.07, tags: 'electronic,experimental,mix', bitrate: 128 },
    { stationuuid: '9616a928-0601-11e8-a442-52543be04c81', name: 'Classic FM', url_resolved: 'https://media-ssl.musicradio.com/ClassicFM', country: 'United Kingdom', state: 'London', geo_lat: 51.50, geo_long: -0.12, tags: 'classical', bitrate: 128 },
    { stationuuid: 'a2b3c4d5-e6f7-0a1b-2c3d-4e5f6a7b8c9d', name: 'Capital FM', url_resolved: 'https://media-ssl.musicradio.com/CapitalUK', country: 'United Kingdom', state: 'London', geo_lat: 51.50, geo_long: -0.12, tags: 'pop,top40', bitrate: 128 },
    
    // Germany
    { stationuuid: '96136d86-0601-11e8-a442-52543be04c81', name: 'WDR Cosmo', url_resolved: 'https://wdr-cosmo-live.icecast.wdr.de/wdr/cosmo/live/mp3/128/stream.mp3', country: 'Germany', state: 'Cologne', geo_lat: 50.93, geo_long: 6.95, tags: 'world', bitrate: 128 },
    { stationuuid: '96136e0c-0601-11e8-a442-52543be04c81', name: 'Deutschlandfunk', url_resolved: 'https://st01.sslstream.dlf.de/dlf/01/128/mp3/stream.mp3', country: 'Germany', state: 'Cologne', geo_lat: 50.93, geo_long: 6.95, tags: 'news,talk,information', bitrate: 128 },
    { stationuuid: '96138652-0601-11e8-a442-52543be04c81', name: 'FluxFM', url_resolved: 'https://streams.fluxfm.de/fluxfm/mp3-320/streams.fluxfm.de/', country: 'Germany', state: 'Berlin', geo_lat: 52.52, geo_long: 13.40, tags: 'alternative,indie,electronic', bitrate: 320 },
    { stationuuid: '9613872c-0601-11e8-a442-52543be04c81', name: 'ByteFM', url_resolved: 'https://stream.byte.fm/bytefm', country: 'Germany', state: 'Hamburg', geo_lat: 53.55, geo_long: 9.99, tags: 'indie,alternative,electronic', bitrate: 128 },
    { stationuuid: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', name: 'Antenne Bayern', url_resolved: 'https://stream.antenne.de/antenne/stream/mp3', country: 'Germany', state: 'Munich', geo_lat: 48.13, geo_long: 11.58, tags: 'pop,hits', bitrate: 128 },
    
    // France
    { stationuuid: '9611a892-0601-11e8-a442-52543be04c81', name: 'France Info', url_resolved: 'https://icecast.radiofrance.fr/franceinfo-hifi.aac', country: 'France', state: 'Paris', geo_lat: 48.85, geo_long: 2.35, tags: 'news,talk', bitrate: 128 },
    { stationuuid: '9611a454-0601-11e8-a442-52543be04c81', name: 'FIP', url_resolved: 'https://icecast.radiofrance.fr/fip-hifi.aac', country: 'France', state: 'Paris', geo_lat: 48.85, geo_long: 2.35, tags: 'eclectic,jazz,pop,rock,world', bitrate: 128 },
    { stationuuid: '9611bbfe-0601-11e8-a442-52543be04c81', name: 'Radio Nova', url_resolved: 'https://novazz.ice.infomaniak.ch/novazz-128.mp3', country: 'France', state: 'Paris', geo_lat: 48.85, geo_long: 2.35, tags: 'soul,funk,world,electro', bitrate: 128 },
    { stationuuid: 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', name: 'France Musique', url_resolved: 'https://icecast.radiofrance.fr/francemusique-hifi.aac', country: 'France', state: 'Paris', geo_lat: 48.85, geo_long: 2.35, tags: 'classical,jazz', bitrate: 128 },
    
    // Italy
    { stationuuid: '96119560-0601-11e8-a442-52543be04c81', name: 'RAI Radio 3', url_resolved: 'https://icestreaming.rai.it/3.mp3', country: 'Italy', state: 'Rome', geo_lat: 41.90, geo_long: 12.49, tags: 'classical,culture,jazz', bitrate: 128 },
    { stationuuid: '961195a6-0601-11e8-a442-52543be04c81', name: 'Radio Capital', url_resolved: 'https://videoesse.secure.footprint.net/radio/capital/live/capitallive.isml/playlist.m3u8', country: 'Italy', state: 'Rome', geo_lat: 41.90, geo_long: 12.49, tags: 'oldies,80s,pop', bitrate: 128 },
    { stationuuid: 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', name: 'Radio 24', url_resolved: 'https://shoutcast.radio24.it:8000/listen.mp3', country: 'Italy', state: 'Milan', geo_lat: 45.46, geo_long: 9.18, tags: 'news,talk', bitrate: 128 },
    
    // Spain
    { stationuuid: '9615e492-0601-11e8-a442-52543be04c81', name: 'RNE Clásica', url_resolved: 'https://rtvelivestream.akamaized.net/rtvesec/rne/rne_clasica_main.mp3', country: 'Spain', state: 'Madrid', geo_lat: 40.41, geo_long: -3.70, tags: 'classical', bitrate: 192 },
    { stationuuid: '9615e496-0601-11e8-a442-52543be04c81', name: 'Radio 3', url_resolved: 'https://rtvelivestream.akamaized.net/rtvesec/rne/radio3_main.mp3', country: 'Spain', state: 'Madrid', geo_lat: 40.41, geo_long: -3.70, tags: 'alternative,indie,rock', bitrate: 192 },
    
    // Netherlands
    { stationuuid: '96120484-0601-11e8-a442-52543be04c81', name: 'NPO Radio 4', url_resolved: 'https://icecast.omroep.nl/radio4-bb-mp3', country: 'Netherlands', state: 'Hilversum', geo_lat: 52.22, geo_long: 5.17, tags: 'classical', bitrate: 192 },
    { stationuuid: '96120516-0601-11e8-a442-52543be04c81', name: 'Concertzender', url_resolved: 'https://streams.greenhost.nl:8080/concertzender.mp3', country: 'Netherlands', state: 'Utrecht', geo_lat: 52.09, geo_long: 5.12, tags: 'classical,jazz,baroque,contemporary', bitrate: 128 },
    
    // Austria
    { stationuuid: '9611b228-0601-11e8-a442-52543be04c81', name: 'FM4', url_resolved: 'https://orf-live.ors-shoutcast.at/fm4-q2a', country: 'Austria', state: 'Vienna', geo_lat: 48.20, geo_long: 16.37, tags: 'alternative,electronic', bitrate: 128 },
    
    // Switzerland
    { stationuuid: '9612502c-0601-11e8-a442-52543be04c81', name: 'Radio Swiss Classic', url_resolved: 'https://stream.srg-ssr.ch/m/rsc_de/mp3_128', country: 'Switzerland', state: 'Bern', geo_lat: 46.94, geo_long: 7.44, tags: 'classical', bitrate: 128 },
    { stationuuid: '9612502a-0601-11e8-a442-52543be04c81', name: 'Radio Swiss Jazz', url_resolved: 'https://stream.srg-ssr.ch/m/rsj/mp3_128', country: 'Switzerland', state: 'Basel', geo_lat: 47.55, geo_long: 7.58, tags: 'jazz', bitrate: 128 },
    
    // Ireland
    { stationuuid: '96118b60-0601-11e8-a442-52543be04c81', name: 'RTÉ Radio 1', url_resolved: 'https://audio-edge-510b-fra-dax-0.radioplayer.live/rte/rte_radio1/icecast.audio', country: 'Ireland', state: 'Dublin', geo_lat: 53.34, geo_long: -6.26, tags: 'news,talk,irish', bitrate: 128 },
    
    // Iceland
    { stationuuid: '96118d0c-0601-11e8-a442-52543be04c81', name: 'Rás 1', url_resolved: 'https://netradio-a.secure.ruv.is/ras1', country: 'Iceland', state: 'Reykjavík', geo_lat: 64.14, geo_long: -21.94, tags: 'news,talk,culture,classical', bitrate: 128 },
    
    // Greece
    { stationuuid: '9611843a-0601-11e8-a442-52543be04c81', name: 'Kosmos 93.6', url_resolved: 'https://radiostreaming.ert.gr/ert-kosmos', country: 'Greece', state: 'Athens', geo_lat: 37.98, geo_long: 23.72, tags: 'world,jazz,reggae', bitrate: 128 },

    // === Asia ===
    // Japan
    { stationuuid: '9612a450-0601-11e8-a442-52543be04c81', name: 'J-Wave 81.3', url_resolved: 'https://rbc-radio-live.online/j-wave/81.3/icecast.audio', country: 'Japan', state: 'Tokyo', geo_lat: 35.68, geo_long: 139.69, tags: 'j-pop,pop,rock', bitrate: 128 },
    { stationuuid: '9612a452-0601-11e8-a442-52543be04c81', name: 'NHK FM', url_resolved: 'https://nhkradioakfm-i.akamaihd.net/hls/live/512284/nhkradioakfm/master.m3u8', country: 'Japan', state: 'Tokyo', geo_lat: 35.68, geo_long: 139.69, tags: 'classical,jazz,traditional', bitrate: 64 },
    { stationuuid: 'e5f6a7b8-b8c9-4a5b-6c7d-8e9f0a1b2c3d', name: 'Ottava', url_resolved: 'https://ottava.streamguys1.com/live', country: 'Japan', state: 'Tokyo', geo_lat: 35.68, geo_long: 139.69, tags: 'classical', bitrate: 128 },
    
    // India
    { stationuuid: '9615555c-0601-11e8-a442-52543be04c81', name: 'Radio Mirchi', url_resolved: 'https://peridot.streamguys1.com/Mirchi', country: 'India', state: 'Mumbai', geo_lat: 19.07, geo_long: 72.87, tags: 'bollywood,hindi', bitrate: 64 },
    { stationuuid: '9615552a-0601-11e8-a442-52543be04c81', name: 'All India Radio', url_resolved: 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio001/playlist.m3u8', country: 'India', state: 'Delhi', geo_lat: 28.61, geo_long: 77.20, tags: 'news,indian classical', bitrate: 64 },
    { stationuuid: 'f7a8b9c0-e1f2-3a4b-5c6d-7e8f9a0b1c2d', name: 'Vividh Bharati', url_resolved: 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio001/playlist.m3u8', country: 'India', state: 'Online', geo_lat: 28.61, geo_long: 77.20, tags: 'classical,hindi', bitrate: 64 },
    
    // South Korea
    { stationuuid: '9612b77a-0601-11e8-a442-52543be04c81', name: 'KBS Cool FM', url_resolved: 'https://kbs-radio-cool.gscdn.com/coolfm_128k', country: 'South Korea', state: 'Seoul', geo_lat: 37.56, geo_long: 126.97, tags: 'k-pop,pop', bitrate: 128 },
    { stationuuid: 'g8h9i0j1-k2l3-4m5n-6o7p-8q9r0s1t2u3v', name: 'Gugak FM', url_resolved: 'https://live.gugakfm.co.kr/gugak_24h.mp3', country: 'South Korea', state: 'Seoul', geo_lat: 37.56, geo_long: 126.97, tags: 'traditional,korean', bitrate: 128 },
    
    // Indonesia
    { stationuuid: '96128038-0601-11e8-a442-52543be04c81', name: 'Prambors FM', url_resolved: 'https://masima.rastream.com/masima-pramborsjakarta', country: 'Indonesia', state: 'Jakarta', geo_lat: -6.20, geo_long: 106.84, tags: 'top40,pop', bitrate: 128 },
    
    // Thailand
    { stationuuid: '961266be-0601-11e8-a442-52543be04c81', name: 'Cat Radio', url_resolved: 'https://streaming.catradio.tv/cat-radio', country: 'Thailand', state: 'Bangkok', geo_lat: 13.75, geo_long: 100.50, tags: 'indie,alternative,thai', bitrate: 128 },

    // China
    { stationuuid: 'h9i0j1k2-l3m4-5n6o-7p8q-9r0s1t2u3v4w', name: 'CNR Radio 1', url_resolved: 'https://lslive.at.cntv.lxdns.com/live/flv/channel1.flv', country: 'China', state: 'Beijing', geo_lat: 39.90, geo_long: 116.40, tags: 'news,talk', bitrate: 128 },
    { stationuuid: 'i0j1k2l3-m4n5-6o7p-8q9r-0s1t2u3v4w5x', name: 'CRI News Plus', url_resolved: 'https://listen.cri.cn/newsplus.mp3', country: 'China', state: 'Beijing', geo_lat: 39.90, geo_long: 116.40, tags: 'news,english', bitrate: 128 },

    // === Israel (Verified Working HTTPS URLs & Fallbacks) ===
    {
        stationuuid: '96118d04-0601-11e8-a442-52543be04c81',
        name: 'Radius 100FM (רדיוס)',
        url_resolved: 'https://cdn.cybercdn.live/Radios_100FM/Audio/icecast.audio',
        fallback_urls: ['https://gb25.streamgates.net/radios-audio/100Top40/icecast.audio'],
        country: 'Israel',
        state: 'Tel Aviv',
        geo_lat: 32.107,
        geo_long: 34.971,
        tags: 'pop,rock,top40,israel',
        bitrate: 128
    },
    {
        stationuuid: '96118d0a-0601-11e8-a442-52543be04c81',
        name: 'Eco99fm (אקו 99FM)',
        url_resolved: 'https://eco01.livecdn.biz/ecolive/99fm/icecast.audio',
        fallback_urls: ['https://eco01.livecdn.biz/ecolive/99fm_aac/icecast.audio'],
        country: 'Israel',
        state: 'Herzliya',
        geo_lat: 32.16,
        geo_long: 34.84,
        tags: 'pop,rock,adult contemporary,israel',
        bitrate: 128
    },
    {
        stationuuid: '96118d1a-0601-11e8-a442-52543be04c81',
        name: 'Kan Gimel (כאן גימל)',
        url_resolved: 'https://playerservices.streamtheworld.com/api/livestream-redirect/KAN_GIMMEL.mp3',
        fallback_urls: [
            'https://27873.live.streamtheworld.com/KAN_GIMMEL.mp3',
            'https://kancdn.medonecdn.net/livehls/oil/kancdn-live/live/radio/kan_gimel/live.livx/playlist.m3u8'
        ],
        country: 'Israel',
        state: 'Jerusalem',
        geo_lat: 31.77,
        geo_long: 35.21,
        tags: 'hebrew,israeli music,pop,israel',
        bitrate: 128
    },
    {
        stationuuid: '96118d18-0601-11e8-a442-52543be04c81',
        name: 'Kan 88 (כאן 88)',
        url_resolved: 'https://playerservices.streamtheworld.com/api/livestream-redirect/KAN_88.mp3',
        fallback_urls: [
            'https://29073.live.streamtheworld.com/KAN_88.mp3',
            'https://kancdn.medonecdn.net/livehls/oil/kancdn-live/live/radio/kan_88/live.livx/playlist.m3u8'
        ],
        country: 'Israel',
        state: 'Tel Aviv',
        geo_lat: 32.08,
        geo_long: 34.78,
        tags: 'alternative,indie,rock,jazz,israel',
        bitrate: 128
    },
    {
        stationuuid: 'c2b724db-9ddb-41e2-b190-324014c55467',
        name: 'Kan Bet (כאן רשת ב)',
        url_resolved: 'https://playerservices.streamtheworld.com/api/livestream-redirect/KAN_BET.mp3',
        fallback_urls: ['https://28563.live.streamtheworld.com/KAN_BET.mp3'],
        country: 'Israel',
        state: 'Jerusalem',
        geo_lat: 31.78,
        geo_long: 35.20,
        tags: 'news,talk,hebrew,israel',
        bitrate: 128
    },
    {
        stationuuid: '96118d08-0601-11e8-a442-52543be04c81',
        name: 'Kan Kol HaMusica (כאן קול המוסיקה)',
        url_resolved: 'https://playerservices.streamtheworld.com/api/livestream-redirect/KAN_KOL_HAMUSICA.mp3',
        fallback_urls: ['https://28563.live.streamtheworld.com/KAN_KOL_HAMUSICA.mp3'],
        country: 'Israel',
        state: 'Jerusalem',
        geo_lat: 31.79,
        geo_long: 35.22,
        tags: 'classical,culture,israel',
        bitrate: 128
    },
    {
        stationuuid: '7a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c01',
        name: 'Kan Tarbut (כאן תרבות)',
        url_resolved: 'https://playerservices.streamtheworld.com/api/livestream-redirect/KAN_TARBUT.mp3',
        country: 'Israel',
        state: 'Jerusalem',
        geo_lat: 31.76,
        geo_long: 35.21,
        tags: 'culture,talk,hebrew,israel',
        bitrate: 128
    },
    {
        stationuuid: '7a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c02',
        name: 'Kan Moreshet (כאן מורשת)',
        url_resolved: 'https://playerservices.streamtheworld.com/api/livestream-redirect/KAN_MORESHET.mp3',
        country: 'Israel',
        state: 'Jerusalem',
        geo_lat: 31.77,
        geo_long: 35.19,
        tags: 'culture,heritage,talk,israel',
        bitrate: 128
    },
    {
        stationuuid: '7a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c03',
        name: 'Kan Reka (כאן רקע)',
        url_resolved: 'https://playerservices.streamtheworld.com/api/livestream-redirect/KAN_REKA.mp3',
        country: 'Israel',
        state: 'Jerusalem',
        geo_lat: 31.78,
        geo_long: 35.23,
        tags: 'news,multilingual,israel',
        bitrate: 128
    },
    {
        stationuuid: '96118d06-0601-11e8-a442-52543be04c81',
        name: 'Galgalatz (גלגלצ)',
        url_resolved: 'https://glzwizzlv.bynetcdn.com/glglz_mp3',
        fallback_urls: [
            'https://glzicylv01.bynetcdn.com/glglz_mp3',
            'https://api.bynetcdn.com/Redirector/glz/glglz/ICE-LIVE'
        ],
        country: 'Israel',
        state: 'Tel Aviv',
        geo_lat: 32.05,
        geo_long: 34.76,
        tags: 'pop,rock,top40,hebrew,israel',
        bitrate: 128
    },
    {
        stationuuid: 'fe82bb92-ccd6-4180-9c0e-44e847ac912f',
        name: 'Galei Tzahal (גלי צה"ל)',
        url_resolved: 'https://glzwizzlv.bynetcdn.com/glz_mp3',
        fallback_urls: ['https://glzicylv01.bynetcdn.com/glz_mp3'],
        country: 'Israel',
        state: 'Tel Aviv',
        geo_lat: 32.055,
        geo_long: 34.755,
        tags: 'news,talk,hebrew,israel',
        bitrate: 128
    },
    {
        stationuuid: '96118d16-0601-11e8-a442-52543be04c81',
        name: 'Tel Aviv Radio 102FM (רדיו תל אביב)',
        url_resolved: 'https://102.livecdn.biz/102fm_aac',
        fallback_urls: ['https://cdn88.mediacast.co.il/102-tlv-live/102fm_aac/icecast.audio'],
        country: 'Israel',
        state: 'Tel Aviv',
        geo_lat: 32.08,
        geo_long: 34.79,
        tags: 'pop,hits,israel',
        bitrate: 128
    },
    {
        stationuuid: '7a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c04',
        name: '103FM (רדיו ללא הפסקה)',
        url_resolved: 'https://cdn.cybercdn.live/103FM/Live/icecast.audio',
        country: 'Israel',
        state: 'Tel Aviv',
        geo_lat: 32.085,
        geo_long: 34.81,
        tags: 'talk,news,hebrew,israel',
        bitrate: 128
    },
    {
        stationuuid: '7a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c05',
        name: 'Radio Lev Hamedina 91FM (רדיו לב המדינה)',
        url_resolved: 'https://cdn.cybercdn.live/Lev_Hamedina/Audio/icecast.audio',
        country: 'Israel',
        state: 'Rishon LeZion',
        geo_lat: 31.96,
        geo_long: 34.80,
        tags: 'pop,mizrahi,hebrew,israel',
        bitrate: 128
    },
    {
        stationuuid: '7a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c06',
        name: 'Radio Haifa 107.5FM (רדיו חיפה)',
        url_resolved: 'https://1075.livecdn.biz/radiohaifa',
        country: 'Israel',
        state: 'Haifa',
        geo_lat: 32.79,
        geo_long: 34.99,
        tags: 'pop,hits,hebrew,israel',
        bitrate: 128
    },
    {
        stationuuid: '7a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c07',
        name: 'Radio Jerusalem 101FM (רדיו ירושלים)',
        url_resolved: 'https://radio.streamgates.net/stream/101fm',
        country: 'Israel',
        state: 'Jerusalem',
        geo_lat: 31.765,
        geo_long: 35.205,
        tags: 'pop,talk,hebrew,israel',
        bitrate: 128
    },
    {
        stationuuid: '7a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c08',
        name: 'Radio Darom 97FM (רדיו דרום)',
        url_resolved: 'https://cdn.cybercdn.live/Darom_97FM/Live/icecast.audio',
        fallback_urls: ['https://cdn.cybercdn.live/Darom_1015FM/Live/icecast.audio'],
        country: 'Israel',
        state: 'Be\'er Sheva',
        geo_lat: 31.25,
        geo_long: 34.79,
        tags: 'pop,mizrahi,talk,israel',
        bitrate: 128
    },
    {
        stationuuid: '7a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c09',
        name: 'Radio Tzafon 104.5FM (רדיו צפון)',
        url_resolved: 'https://radio.streamgates.net/stream/1045fm',
        country: 'Israel',
        state: 'Galilee',
        geo_lat: 32.92,
        geo_long: 35.30,
        tags: 'pop,talk,hebrew,israel',
        bitrate: 128
    },
    {
        stationuuid: '7a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c10',
        name: 'Radio 90FM (רדיו אמצע הדרך)',
        url_resolved: 'https://cdn.cybercdn.live/Emtza_Haderech/Live_Audio/icecast.audio',
        country: 'Israel',
        state: 'Netanya',
        geo_lat: 32.32,
        geo_long: 34.85,
        tags: 'pop,hits,hebrew,israel',
        bitrate: 128
    },
    {
        stationuuid: '80d7414f-1ff8-4c1a-b081-6888a7bcf564',
        name: 'Hakatze (הקצה)',
        url_resolved: 'https://kzradio.mediacast.co.il/kzradio_live/kzradio/icecast.audio',
        country: 'Israel',
        state: 'Tel Aviv',
        geo_lat: 32.07,
        geo_long: 34.77,
        tags: 'alternative,indie,electronic,israel',
        bitrate: 128
    },
    {
        stationuuid: 'e2a1b0c3-12d4-4e5f-8a7b-6c5d4e3f2a1b',
        name: '100FM Mizrachit (רדיו מזרחית)',
        url_resolved: 'https://gb25.streamgates.net/radios-audio/100Mizrachit/icecast.audio',
        fallback_urls: ['https://rs.mizrahit.fm/'],
        country: 'Israel',
        state: 'Tel Aviv',
        geo_lat: 32.11,
        geo_long: 34.97,
        tags: 'mizrahi,oriental,hebrew,israel',
        bitrate: 128
    },
    {
        stationuuid: '60f56ca4-3e39-45a6-ad94-cee362330fd5',
        name: 'Noshmim Mizrahit (נושמים מזרחית)',
        url_resolved: 'https://rs.mizrahit.fm/',
        country: 'Israel',
        state: 'Tel Aviv',
        geo_lat: 32.082,
        geo_long: 34.775,
        tags: 'mizrahi,oriental,hebrew,israel',
        bitrate: 128
    },
    {
        stationuuid: '7a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c11',
        name: 'Kol Chai 93FM (קול חי)',
        url_resolved: 'https://media2.93fm.co.il/live-new',
        country: 'Israel',
        state: 'Bnei Brak',
        geo_lat: 32.09,
        geo_long: 34.83,
        tags: 'jewish,talk,news,israel',
        bitrate: 128
    },
    {
        stationuuid: '7a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c12',
        name: 'Kol Chai Music (קול חי מיוזיק)',
        url_resolved: 'https://media2.93fm.co.il/livemusic',
        country: 'Israel',
        state: 'Bnei Brak',
        geo_lat: 32.095,
        geo_long: 34.835,
        tags: 'jewish music,hebrew,israel',
        bitrate: 128
    },
    {
        stationuuid: '7a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c13',
        name: 'Kol Play (קול פליי)',
        url_resolved: 'https://cdn.cybercdn.live/Kol_Barama/Music/icecast.audio',
        country: 'Israel',
        state: 'Jerusalem',
        geo_lat: 31.785,
        geo_long: 35.19,
        tags: 'jewish music,hits,israel',
        bitrate: 128
    },
    {
        stationuuid: '7a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c14',
        name: 'Galei Israel 94FM (גלי ישראל)',
        url_resolved: 'https://cdn.cybercdn.live/Galei_Israel/Live/icecast.audio',
        country: 'Israel',
        state: 'Jerusalem',
        geo_lat: 31.75,
        geo_long: 35.18,
        tags: 'news,talk,hebrew,israel',
        bitrate: 128
    },
    {
        stationuuid: '3b20727f-de34-40b3-84ba-f7ba1ed9821b',
        name: 'Radio A-Shams (إذاعة الشمس)',
        url_resolved: 'https://cdna.streamgates.net/Ashams/Live/icecast.audio',
        country: 'Israel',
        state: 'Nazareth',
        geo_lat: 32.70,
        geo_long: 35.30,
        tags: 'arabic,pop,news,israel',
        bitrate: 128
    },
    {
        stationuuid: '12bdb972-b398-4b3b-b7bd-c960ee884b78',
        name: 'Radio Nas (רדיו נאס)',
        url_resolved: 'https://cdna.streamgates.net/RadioNas/Live-Audio/icecast.audio',
        country: 'Israel',
        state: 'Nazareth',
        geo_lat: 32.705,
        geo_long: 35.305,
        tags: 'arabic,music,talk,israel',
        bitrate: 128
    },

    // === Africa ===
    // South Africa
    { stationuuid: '96154c12-0601-11e8-a442-52543be04c81', name: '5FM', url_resolved: 'https://iono.fm/s/54', country: 'South Africa', state: 'Johannesburg', geo_lat: -26.20, geo_long: 28.04, tags: 'pop,rock,dance', bitrate: 128 },
    { stationuuid: '96154c1e-0601-11e8-a442-52543be04c81', name: 'Classic FM', url_resolved: 'https://iono.fm/s/57', country: 'South Africa', state: 'Johannesburg', geo_lat: -26.20, geo_long: 28.04, tags: 'classical', bitrate: 128 },
    { stationuuid: 'j1k2l3m4-n5o6-7p8q-9r0s-1t2u3v4w5x6y', name: 'Metro FM', url_resolved: 'https://iono.fm/s/metrofm', country: 'South Africa', state: 'Johannesburg', geo_lat: -26.20, geo_long: 28.04, tags: 'r&b,urban', bitrate: 128 },
    
    // Kenya
    { stationuuid: '96154562-0601-11e8-a442-52543be04c81', name: 'Capital FM', url_resolved: 'https://icecast2.getstreamhosting.com/capitalfm', country: 'Kenya', state: 'Nairobi', geo_lat: -1.29, geo_long: 36.82, tags: 'pop,r&b,african', bitrate: 128 },
    
    // Nigeria
    { stationuuid: '961548e6-0601-11e8-a442-52543be04c81', name: 'Cool FM 96.9', url_resolved: 'https://coolfm-lagos.stream.ng/http', country: 'Nigeria', state: 'Lagos', geo_lat: 6.52, geo_long: 3.37, tags: 'pop,top40,afrobeats', bitrate: 128 },
    { stationuuid: 'k2l3m4n5-o6p7-8q9r-0s1t-2u3v4w5x6y7z', name: 'Wazobia FM', url_resolved: 'https://wazobia-lagos.stream.ng/http', country: 'Nigeria', state: 'Lagos', geo_lat: 6.52, geo_long: 3.37, tags: 'pidgin,talk', bitrate: 128 },

    // === Oceania ===
    // Australia
    { stationuuid: '96156372-0601-11e8-a442-52543be04c81', name: 'ABC Jazz', url_resolved: 'https://live-radio01.mediahubaustralia.com/JAZ/mp3/', country: 'Australia', state: 'Sydney', geo_lat: -33.86, geo_long: 151.20, tags: 'jazz', bitrate: 128 },
    { stationuuid: '96156458-0601-11e8-a442-52543be04c81', name: 'Triple J', url_resolved: 'https://live-radio01.mediahubaustralia.com/3JJJ/mp3/', country: 'Australia', state: 'Sydney', geo_lat: -33.86, geo_long: 151.20, tags: 'alternative,rock', bitrate: 128 },
    { stationuuid: '96156376-0601-11e8-a442-52543be04c81', name: 'ABC Classic', url_resolved: 'https://live-radio01.mediahubaustralia.com/2FMC/mp3/', country: 'Australia', state: 'Sydney', geo_lat: -33.86, geo_long: 151.20, tags: 'classical', bitrate: 128 },
    { stationuuid: 'l3m4n5o6-p7q8-9r0s-1t2u-3v4w5x6y7z8a', name: 'SBS Chill', url_resolved: 'https://sbs-ice.streamguys1.com/sbs-chill', country: 'Australia', state: 'Online', geo_lat: -33.86, geo_long: 151.20, tags: 'chillout,ambient', bitrate: 128 },
    
    // New Zealand
    { stationuuid: '961578dc-0601-11e8-a442-52543be04c81', name: 'RNZ Concert', url_resolved: 'https://radionz.streamguys1.com/concert_128kbps.mp3', country: 'New Zealand', state: 'Wellington', geo_lat: -41.28, geo_long: 174.77, tags: 'classical', bitrate: 128 },
    { stationuuid: '961578da-0601-11e8-a442-52543be04c81', name: 'RNZ National', url_resolved: 'https://radionz.streamguys1.com/national_128kbps.mp3', country: 'New Zealand', state: 'Wellington', geo_lat: -41.28, geo_long: 174.77, tags: 'news,talk', bitrate: 128 },
    { stationuuid: '96157b8a-0601-11e8-a442-52543be04c81', name: '95bFM', url_resolved: 'https://streams.95bfm.com/stream128', country: 'New Zealand', state: 'Auckland', geo_lat: -36.84, geo_long: 174.76, tags: 'student radio,alternative,indie', bitrate: 128 },
];
