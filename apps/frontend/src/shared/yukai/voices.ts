export type TtsProvider = 'elevenlabs' | 'fish'

export type Voice = {
  id: string
  label: string
  provider: TtsProvider
  voiceId: string
  /**
   * Локали для которых этот voice звучит хорошо. Используется в
   * getDefaultVoiceForLocale() при автоподборе голоса под выбранный язык.
   */
  langs?: string[]
}

export const BUILTIN_VOICES: Voice[] = [
  {
    id: 'eleven-kika',
    label: 'ElevenLabs — Yukai (multilingual)',
    provider: 'elevenlabs',
    voiceId: 'YQ8Df5FlfEfMCfGNZHsN',
    // ElevenLabs Turbo v2.5 поддерживает 30+ языков. Отлично для en, ko, de, fr, pt, zh.
    langs: ['en', 'ko', 'de', 'fr', 'pt', 'zh'],
  },
  {
    id: 'fish-ochitsuita-josei',
    label: "Fish — 落ち着いた女性 (Japanese)",
    provider: 'fish',
    voiceId: '0089dce5fefb4c6ba9b9f2f0debe1ddc',
    langs: ['ja'],
  },
  {
    id: 'fish-kasane-teto',
    label: "Fish — Kasane Teto (Spanish)",
    provider: 'fish',
    voiceId: '0118a35dcb604837abe7961a43e13ba8',
    langs: ['es'],
  },
  {
    id: 'fish-ru-female-2',
    label: "Fish — Ясный Женский Голос (Russian)",
    provider: 'fish',
    voiceId: '01fdb6d96cab423c9658413216514b2b',
    langs: ['ru'],
  },
  {
    id: 'fish-ano',
    label: "Fish — あの (Japanese)",
    provider: 'fish',
    voiceId: '022feade5cc0492286a854cc87aff955',
    langs: ['ja'],
  },
  {
    id: 'fish-priscilla-barielle',
    label: "Fish — Priscilla Barielle (Spanish)",
    provider: 'fish',
    voiceId: '0b2aa74c364a49789bcba051f2901a5c',
    langs: ['es'],
  },
  {
    id: 'fish-ko-20s-female',
    label: "Fish — 20대 여성 (Korean)",
    provider: 'fish',
    voiceId: '0ccd4dc7f23d4935956e225e158484c9',
    langs: ['ko'],
  },
  {
    id: 'fish-tsuda-san',
    label: "Fish — 津田さん (Japanese)",
    provider: 'fish',
    voiceId: '0fe651a82aae4fff9aece137404205d5',
    langs: ['ja'],
  },
  {
    id: 'fish-setouchi-jakucho',
    label: "Fish — 瀬戸内寂聴 (Japanese)",
    provider: 'fish',
    voiceId: '18db00b534b74384ba1fcfb91cfa3c34',
    langs: ['ja'],
  },
  {
    id: 'fish-fern',
    label: "Fish — フェルン (Japanese)",
    provider: 'fish',
    voiceId: '1dac8f5fd50648388edfcb4ca6cfb378',
    langs: ['ja'],
  },
  {
    id: 'fish-shinushinu',
    label: "Fish — しぬしぬボイス (Japanese)",
    provider: 'fish',
    voiceId: '1fcb900b5ae349ab92ec33fe532b8ea1',
    langs: ['ja'],
  },
  {
    id: 'fish-voice-2',
    label: "Fish — Голос_для_новы (Russian)",
    provider: 'fish',
    voiceId: '23dc81dab27e4cea8cc2cfe3104747fd',
    langs: ['ru'],
  },
  {
    id: 'fish-garota-fofa',
    label: "Fish — Garota fofa (Portuguese)",
    provider: 'fish',
    voiceId: '24522123b5804bf691a8450d9187f03e',
    langs: ['pt'],
  },
  {
    id: 'fish-iu',
    label: "Fish — 아이유 (Korean)",
    provider: 'fish',
    voiceId: '259d7fde62cd445fbde3ce2d8d4f2f3b',
    langs: ['ko'],
  },
  {
    id: 'fish-ichigo',
    label: "Fish — Ichigo (Japanese)",
    provider: 'fish',
    voiceId: '28d01665c67a4eaf9834a3c3148be14a',
    langs: ['ja'],
  },
  {
    id: 'fish-itoshi-sae',
    label: "Fish — Itoshi sae (Portuguese)",
    provider: 'fish',
    voiceId: '2bb270d0dc344007b53ae25cd00a4e85',
    langs: ['pt'],
  },
  {
    id: 'fish-lingling',
    label: "Fish — 正式版凌灵 (Chinese)",
    provider: 'fish',
    voiceId: '30d1a7a7fa844dc18157eca5e332ec47',
    langs: ['zh'],
  },
  {
    id: 'fish-satoru-gojo',
    label: "Fish — Satoru gojo (Portuguese)",
    provider: 'fish',
    voiceId: '321e91c5439d4588bc06320111f77382',
    langs: ['pt'],
  },
  {
    id: 'fish-kaiser',
    label: "Fish — Kaiser (Japanese)",
    provider: 'fish',
    voiceId: '355a968efaee42229e3db2418ce8b5ad',
    langs: ['ja'],
  },
  {
    id: 'fish-egirl',
    label: "Fish — e girl (German)",
    provider: 'fish',
    voiceId: '37588e3ad8e44f978074b66469eeb4b2',
    langs: ['de'],
  },
  {
    id: 'fish-naoya',
    label: "Fish — naoya (Japanese)",
    provider: 'fish',
    voiceId: '377d86d5932e4d939dfba7a684139168',
    langs: ['ja'],
  },
  {
    id: 'fish-rin-itoshi',
    label: "Fish — Rin itoshi (Japanese)",
    provider: 'fish',
    voiceId: '3a298a0669ed475eb5ea2117ddc7b112',
    langs: ['ja'],
  },
  {
    id: 'fish-luffy',
    label: "Fish — Luffy (Japanese)",
    provider: 'fish',
    voiceId: '3a6f280fac7f40bbbccd62015b09cb03',
    langs: ['ja'],
  },
  {
    id: 'fish-hoshimachi-suisei',
    label: "Fish — 星街すいせい (Japanese)",
    provider: 'fish',
    voiceId: '3ae335faf7b4498993d63ad9185ea6db',
    langs: ['ja'],
  },
  {
    id: 'fish-ja-female',
    label: "Fish — Multy Speaker (Japanese)",
    provider: 'fish',
    voiceId: '3ffcf3ee1e7d4e0eae452923580b0f70',
    langs: ['ja'],
  },
  {
    id: 'fish-ochitsuita-dansei',
    label: "Fish — 落ち着いた男性 (Japanese)",
    provider: 'fish',
    voiceId: '45c5d3723c9c42f598e4776dcfd5f02d',
    langs: ['ja'],
  },
  {
    id: 'fish-fuuka',
    label: "Fish — ふうか (Japanese)",
    provider: 'fish',
    voiceId: '46745543e52548238593a3962be77e3a',
    langs: ['ja'],
  },
  {
    id: 'fish-light-yagami',
    label: "Fish — Light Yagami v2 (Japanese)",
    provider: 'fish',
    voiceId: '4bc1d3d1fa60415f989b8e0b99f333e1',
    langs: ['ja'],
  },
  {
    id: 'fish-hoshi-v4',
    label: "Fish — ほしVer4 (Japanese)",
    provider: 'fish',
    voiceId: '4da3f8598f874e47a55eb887783575f7',
    langs: ['ja'],
  },
  {
    id: 'fish-ko-20s-nagunagu',
    label: "Fish — 20대 여자_나긋나긋 쇼츠 (Korean)",
    provider: 'fish',
    voiceId: '4e118bfbb83e401c84699c09b5f08257',
    langs: ['ko'],
  },
  {
    id: 'fish-teto',
    label: "Fish — teto (Japanese)",
    provider: 'fish',
    voiceId: '4fbb537a5c354cf1bb5ae8b6daa5719f',
    langs: ['ja'],
  },
  {
    id: 'fish-ja-5161d414',
    label: "Fish — 元気な女性 (Japanese)",
    provider: 'fish',
    voiceId: '5161d41404314212af1254556477c17d',
    langs: ['ja'],
  },
  {
    id: 'fish-itadori-yuji',
    label: "Fish — Itadori Yuji (Japanese)",
    provider: 'fish',
    voiceId: '52bf0be202aa4e07b1b0e1bc4e68d4ca',
    langs: ['ja'],
  },
  {
    id: 'fish-ja-54fa0418',
    label: "Fish — ほしVer3.0 (Japanese)",
    provider: 'fish',
    voiceId: '54fa0418415a4103885ec909023b0285',
    langs: ['ja'],
  },
  {
    id: 'fish-dio',
    label: "Fish — Dio (Japanese)",
    provider: 'fish',
    voiceId: '5977d725c0ab499496e600fa9fc9bf20',
    langs: ['ja'],
  },
  {
    id: 'fish-ja-5ab84024',
    label: "Fish — 強弱なしこまいぼいす (Japanese)",
    provider: 'fish',
    voiceId: '5ab84024cfc8401a943d9fb427aac3d5',
    langs: ['ja'],
  },
  {
    id: 'fish-voz-feminina',
    label: "Fish — Voz feminina (Portuguese)",
    provider: 'fish',
    voiceId: '5b5a485751824c1993e210602cee16cb',
    langs: ['pt'],
  },
  {
    id: 'fish-zh-5c353fdb',
    label: "Fish — 女大学生 (Chinese)",
    provider: 'fish',
    voiceId: '5c353fdb312f4888836a9a5680099ef0',
    langs: ['zh'],
  },
  {
    id: 'fish-ja-5ec124a5',
    label: "Fish — 葛城ミサト (Japanese)",
    provider: 'fish',
    voiceId: '5ec124a55410453a9c56aae75d3ba4c0',
    langs: ['ja'],
  },
  {
    id: 'fish-toji',
    label: "Fish — Toji (Japanese)",
    provider: 'fish',
    voiceId: '5fda2e9aa00040a7b731dfd28185ae1c',
    langs: ['ja'],
  },
  {
    id: 'fish-ja-63bc41e6',
    label: "Fish — 元気な女性v2 (Japanese)",
    provider: 'fish',
    voiceId: '63bc41e652214372b15d9416a30a60b4',
    langs: ['ja'],
  },
  {
    id: 'fish-zahide',
    label: "Fish — Zahide (German)",
    provider: 'fish',
    voiceId: '6c633d2f94a942849ee0ff6e0ee11930',
    langs: ['de'],
  },
  {
    id: 'fish-ja-6daf5fa1',
    label: "Fish — 人生のたび (Japanese)",
    provider: 'fish',
    voiceId: '6daf5fa1876149899323e17f07245d2f',
    langs: ['ja'],
  },
  {
    id: 'fish-voice-1',
    label: "Fish — Mita",
    provider: 'fish',
    voiceId: '6dc11f3f67a543f6ad4537a4a347e224',
    langs: ['ru'],
  },
  {
    id: 'fish-ja-70216001',
    label: "Fish — えっちなウィスパーボイスメイドロボ (Japanese)",
    provider: 'fish',
    voiceId: '7021600145ae4d1f98e6f815eefb9b50',
    langs: ['ja'],
  },
  {
    id: 'fish-itoshi-rin',
    label: "Fish — Itoshi Rin (Japanese)",
    provider: 'fish',
    voiceId: '70f4bab034954cc186cab3a69fe3fd2a',
    langs: ['ja', 'en'],
  },
  {
    id: 'fish-voice-3',
    label: "Fish — ななみん (Japanese)",
    provider: 'fish',
    voiceId: '71bf4cb71cd44df6aa603d51db8f92ff',
    langs: ['ja'],
  },
  {
    id: 'fish-ko-79696c61',
    label: "Fish — minju！！ (Korean)",
    provider: 'fish',
    voiceId: '79696c61cf034b3e84b5fd7a90169498',
    langs: ['ko'],
  },
  {
    id: 'fish-gojo',
    label: "Fish — Gojo (German)",
    provider: 'fish',
    voiceId: '7c179b8c40334f81948ff6208e2e88e5',
    langs: ['de'],
  },
  {
    id: 'fish-zh-7f92f8af',
    label: "Fish — AD学姐 (Chinese)",
    provider: 'fish',
    voiceId: '7f92f8afb8ec43bf81429cc1c9199cb1',
    langs: ['zh'],
  },
  {
    id: 'fish-ja-827be896',
    label: "Fish — 五条悟 (Japanese)",
    provider: 'fish',
    voiceId: '827be896a6954a8199ce4b2baad6af36',
    langs: ['ja'],
  },
  {
    id: 'fish-pretty-girl',
    label: "Fish — Pretty girl (English)",
    provider: 'fish',
    voiceId: '83c19893c4974594839bd2d101b1fd66',
    langs: ['en'],
  },
  {
    id: 'fish-ja-871cff8b',
    label: "Fish — 团长 (Japanese)",
    provider: 'fish',
    voiceId: '871cff8bf3d6420fb462e97a28d1c718',
    langs: ['ja'],
  },
  {
    id: 'fish-sasuke',
    label: "Fish — Sasuke (Japanese)",
    provider: 'fish',
    voiceId: '886d9cb7a8df4af987cbf379cb14d282',
    langs: ['ja'],
  },
  {
    id: 'fish-christa-deutsch',
    label: "Fish — Christa deutsch (German)",
    provider: 'fish',
    voiceId: '88b18e0d81474a0ca08e2ea6f9df5ff4',
    langs: ['de'],
  },
  {
    id: 'fish-sukuna-mido',
    label: "Fish — Sukuna Mido (English)",
    provider: 'fish',
    voiceId: '91a9ac2cf92a46e8a742c3a8145750f9',
    langs: ['en', 'ru', 'ja'],
  },
  {
    id: 'fish-ja-92c556e1',
    label: "Fish — 信ボイスver1.0 (Japanese)",
    provider: 'fish',
    voiceId: '92c556e1a13e4ac7add3d1a8665c3cb8',
    langs: ['ja'],
  },
  {
    id: 'fish-sarah',
    label: "Fish — Sarah (English)",
    provider: 'fish',
    voiceId: '933563129e564b19a115bedd57b7406a',
    langs: ['en'],
  },
  {
    id: 'fish-ja-94cffec5',
    label: "Fish — さかねVer1.o (Japanese)",
    provider: 'fish',
    voiceId: '94cffec561f7423c9ddabb4ad2112a37',
    langs: ['ja'],
  },
  {
    id: 'fish-karina',
    label: "Fish — Karina (Korean)",
    provider: 'fish',
    voiceId: '96ba68c7f2364bd7934d1c4db83779ea',
    langs: ['ko'],
  },
  {
    id: 'fish-samplesan',
    label: "Fish — samplesan (Japanese)",
    provider: 'fish',
    voiceId: '98637f9c494b4c228c55a0dacdb4f298',
    langs: ['ja'],
  },
  {
    id: 'fish-michael-kaiser',
    label: "Fish — Michael Kaiser (Japanese)",
    provider: 'fish',
    voiceId: '98d4a6be1b404e1b8500d3ef493343ad',
    langs: ['ja', 'de'],
  },
  {
    id: 'fish-ko-9aae5492',
    label: "Fish — 유라-기쁨- (Korean)",
    provider: 'fish',
    voiceId: '9aae54921dd944948ee08d35f6b5f984',
    langs: ['ko'],
  },
  {
    id: 'fish-ja-9bf66083',
    label: "Fish — ナレーター男性 (Japanese)",
    provider: 'fish',
    voiceId: '9bf6608381a34f47ada3753f2e9f9381',
    langs: ['ja'],
  },
  {
    id: 'fish-amo',
    label: "Fish — Amo (Japanese)",
    provider: 'fish',
    voiceId: '9c5db5c3cf304aff92dbd102b045ead0',
    langs: ['ja'],
  },
  {
    id: 'fish-ja-a003f932',
    label: "Fish — 上条当麻 (Japanese)",
    provider: 'fish',
    voiceId: 'a003f93264534ec1aeafb1d07dcc5d59',
    langs: ['ja'],
  },
  {
    id: 'fish-madoka',
    label: "Fish — Madoka (Spanish)",
    provider: 'fish',
    voiceId: 'a00a2848fef646fdacfc21830af27d2c',
    langs: ['es'],
  },
  {
    id: 'fish-ja-a44786ac',
    label: "Fish — エルフの女王シルフィラ (Japanese)",
    provider: 'fish',
    voiceId: 'a44786ac8b5344778f214b675b0264ae',
    langs: ['ja'],
  },
  {
    id: 'fish-voix-francaise-expressive',
    label: "Fish — Voix Française (French)",
    provider: 'fish',
    voiceId: 'a4de3afb47714454b47a0de76c3cb5f6',
    langs: ['fr'],
  },
  {
    id: 'fish-giei',
    label: "Fish — Giei (Japanese)",
    provider: 'fish',
    voiceId: 'a4ec61f0520747089ba7581612c5334f',
    langs: ['ja'],
  },
  {
    id: 'fish-sukuna',
    label: "Fish — Sukuna (Japanese)",
    provider: 'fish',
    voiceId: 'a5742b44376d40ca97095b45b14859ff',
    langs: ['ja'],
  },
  {
    id: 'fish-ko-a9574d61',
    label: "Fish — 진우-기쁨- (Korean)",
    provider: 'fish',
    voiceId: 'a9574d6184714eac96a0a892b719289f',
    langs: ['ko'],
  },
  {
    id: 'fish-johnny-joestar',
    label: "Fish — Johnny Joestar (Japanese)",
    provider: 'fish',
    voiceId: 'ae90570e089f410ca8a8ed3672f235ea',
    langs: ['ja', 'en'],
  },
  {
    id: 'fish-rem-re-zero',
    label: "Fish — Rem (re:zero) (Japanese)",
    provider: 'fish',
    voiceId: 'b428e76c148a4bf998e6e4d9ef3c648b',
    langs: ['ja'],
  },
  {
    id: 'fish-ja-b6ab3f92',
    label: "Fish — めぐみん (Japanese)",
    provider: 'fish',
    voiceId: 'b6ab3f925fca401a9fd9900db6594b8e',
    langs: ['ja'],
  },
  {
    id: 'fish-ja-be1e2edd',
    label: "Fish — 七海建人 (Japanese)",
    provider: 'fish',
    voiceId: 'be1e2eddc1584ec3bde1eeccbdf5534a',
    langs: ['ja'],
  },
  {
    id: 'fish-ja-be67ba79',
    label: "Fish — 高木さん　高橋りえ (Japanese)",
    provider: 'fish',
    voiceId: 'be67ba79424149ec8a4564cebd3e7938',
    langs: ['ja'],
  },
  {
    id: 'fish-ja-bedcec97',
    label: "Fish — ゼン・ウィスタリア (Japanese)",
    provider: 'fish',
    voiceId: 'bedcec97beb041e09463dc911adea907',
    langs: ['ja'],
  },
  {
    id: 'fish-voice-4',
    label: "Fish — 女の子 (Japanese)",
    provider: 'fish',
    voiceId: 'bf5634e34ee5489991fe687ad0d202c5',
    langs: ['ja'],
  },
  {
    id: 'fish-kim-soo-hyun',
    label: "Fish — Kim soo-Hyun (Korean)",
    provider: 'fish',
    voiceId: 'bfdf5f0ad6d3401281c1f0196fc4a7de',
    langs: ['ko'],
  },
  {
    id: 'fish-voz-femenina-espanol',
    label: "Fish — Voz Femenina Español (Spanish)",
    provider: 'fish',
    voiceId: 'bfed5c0810a347dbb62e8ccce7f59c48',
    langs: ['es'],
  },
  {
    id: 'fish-ja-c13253b3',
    label: "Fish — えほん (Japanese)",
    provider: 'fish',
    voiceId: 'c13253b3e1fa4580b1295ef7c7e96c41',
    langs: ['ja'],
  },
  {
    id: 'fish-ja-c496c7d0',
    label: "Fish — 男の子 (Japanese)",
    provider: 'fish',
    voiceId: 'c496c7d0e93640a59a0befd78b47f39e',
    langs: ['ja'],
  },
  {
    id: 'fish-kasane-teto-ja',
    label: "Fish — Kasane Teto (Japanese)",
    provider: 'fish',
    voiceId: 'c4e606d41f50427c8e15470eb221e885',
    langs: ['ja'],
  },
  {
    id: 'fish-zh-c5c17c97',
    label: "Fish — 千早爱音 (Chinese)",
    provider: 'fish',
    voiceId: 'c5c17c9709384ba9a4b294662a2af0b1',
    langs: ['zh'],
  },
  {
    id: 'fish-gojo-satoru-japanese-trained',
    label: "Fish — Gojo Satoru (Japanese)",
    provider: 'fish',
    voiceId: 'c748ffc7823b419481f7003b313566ad',
    langs: ['ja'],
  },
  {
    id: 'fish-ja-ca0bb132',
    label: "Fish — ヒカキン風 (Japanese)",
    provider: 'fish',
    voiceId: 'ca0bb132ca94452b9adf992a4ef0e7c6',
    langs: ['ja'],
  },
  {
    id: 'fish-shinobu-kocho',
    label: "Fish — Shinobu kocho (Spanish)",
    provider: 'fish',
    voiceId: 'cc19dc88556b4dc4ac2b0da91680b162',
    langs: ['es'],
  },
  {
    id: 'fish-ko-cc3fdcc0',
    label: "Fish — iu韩文 (Korean)",
    provider: 'fish',
    voiceId: 'cc3fdcc04e3d49a2a6a0e447df220153',
    langs: ['ko'],
  },
  {
    id: 'fish-song-joongki-voice',
    label: "Fish — Song joongki voice (Korean)",
    provider: 'fish',
    voiceId: 'ce9993b625c848b6a9856fd41e4ae00c',
    langs: ['ko'],
  },
  {
    id: 'fish-ja-d362e9b6',
    label: "Fish — エミリア (Japanese)",
    provider: 'fish',
    voiceId: 'd362e9b6e3a9464cbdc4e5185cce4a93',
    langs: ['ja'],
  },
  {
    id: 'fish-till-alien-stage',
    label: "Fish — Till^^ (Alien stage) (English)",
    provider: 'fish',
    voiceId: 'd9708e800c754f0c876953e74d846f5a',
    langs: ['en', 'ko'],
  },
  {
    id: 'fish-ja-dc506e3a',
    label: "Fish — レム (Japanese)",
    provider: 'fish',
    voiceId: 'dc506e3a89b34deb9ee98000b2e6d241',
    langs: ['ja'],
  },
  {
    id: 'fish-ja-dd25aabc',
    label: "Fish — おじさん (Japanese)",
    provider: 'fish',
    voiceId: 'dd25aabce1894d94b5c3d1230efaeb68',
    langs: ['ja'],
  },
  {
    id: 'fish-ado',
    label: "Fish — Ado (Japanese)",
    provider: 'fish',
    voiceId: 'dd9d993bed6541fa82a5a2902e148523',
    langs: ['ja'],
  },
  {
    id: 'fish-said',
    label: "Fish — said (German)",
    provider: 'fish',
    voiceId: 'deb28100c45547c8871753ab1fdf9856',
    langs: ['de'],
  },
  {
    id: 'fish-mitsuri-kanroji',
    label: "Fish — Mitsuri kanroji (Spanish)",
    provider: 'fish',
    voiceId: 'e0229f9c45e543219c4a10d9f3803337',
    langs: ['es'],
  },
  {
    id: 'fish-isagi-yoichi-v2',
    label: "Fish — Isagi Yoichi v2 (English)",
    provider: 'fish',
    voiceId: 'e40dc2616cad4ce899ee3abda491b251',
    langs: ['en', 'ja'],
  },
  {
    id: 'fish-mita-pt-br',
    label: "Fish — Mita (Portuguese)",
    provider: 'fish',
    voiceId: 'ea3bf7f7c7af4b59be4715013e1c4428',
    langs: ['pt'],
  },
  {
    id: 'fish-ja-ed626286',
    label: "Fish — ロキシー・ミグルディア (Japanese)",
    provider: 'fish',
    voiceId: 'ed626286e2394af1a4a88fee6062b77e',
    langs: ['ja'],
  },
  {
    id: 'fish-en-f2e45ab1',
    label: "Fish — アスナ (English)",
    provider: 'fish',
    voiceId: 'f2e45ab1a4a548e2860efea1aa2b416e',
    langs: ['en', 'ja'],
  },
  {
    id: 'fish-kurumi-tokisaki-nightmare',
    label: "Fish — Kurumi Tokisaki (English)",
    provider: 'fish',
    voiceId: 'f9f294f55fd24e28b5b6469ae7e17ea9',
    langs: ['en', 'ja'],
  },
  {
    id: 'fish-ja-fa051072',
    label: "Fish — 偽白井黒こ (Japanese)",
    provider: 'fish',
    voiceId: 'fa0510720939499d98edea2b9af0776a',
    langs: ['ja'],
  },
  {
    id: 'fish-zh-faccba1a',
    label: "Fish — 温柔动听女声 (Chinese)",
    provider: 'fish',
    voiceId: 'faccba1a8ac54016bcfc02761285e67f',
    langs: ['zh'],
  },
  {
    id: 'fish-zh-fbe02f83',
    label: "Fish — 嘉岚3.0 (Chinese)",
    provider: 'fish',
    voiceId: 'fbe02f8306fc4d3d915e9871722a39d5',
    langs: ['zh'],
  },
  {
    id: 'fish-ja-fbea303b',
    label: "Fish — まな (Japanese)",
    provider: 'fish',
    voiceId: 'fbea303b64374bffb8843569404b095e',
    langs: ['ja'],
  },
  {
    id: 'fish-anya',
    label: "Fish — Anya (Portuguese)",
    provider: 'fish',
    voiceId: 'ffe41701970d4b339ef7906300716f99',
    langs: ['pt'],
  },
]

export const DEFAULT_VOICE_ID = 'fish-voice-1'

/**
 * Дефолтные тексты для preview голоса в Settings — каждый на родном языке голоса,
 * чтобы юзер услышал как голос реально звучит (а не японский voice читающий
 * английский текст с акцентом).
 */
const VOICE_SAMPLES: Record<string, string> = {
  ja: 'こんにちは！愉快です、よろしくね。',
  en: "Hi! I'm Yukai, nice to meet you.",
  ko: '안녕하세요! 저는 유카이예요, 만나서 반가워요.',
  zh: '你好！我是愉快，很高兴认识你。',
  ru: 'Привет! Я Yukai, рада знакомству.',
  de: 'Hallo! Ich bin Yukai, freut mich, dich kennenzulernen.',
  fr: 'Salut ! Je suis Yukai, ravie de te rencontrer.',
  pt: 'Oi! Eu sou Yukai, prazer em te conhecer.',
  es: '¡Hola! Soy Yukai, encantada de conocerte.',
}

export function getVoiceSampleText(voice: Voice, fallbackLocale = 'en'): string {
  const lang = voice.langs?.[0] ?? fallbackLocale
  return VOICE_SAMPLES[lang] ?? VOICE_SAMPLES[fallbackLocale] ?? VOICE_SAMPLES.en
}

/**
 * Подобрать дефолтный voice для локали. Берём первый голос у которого
 * `langs[0] === locale` (порядок в BUILTIN_VOICES определяет дефолт). Для
 * русского — фиксированно Mita (исторический дефолт, юзеры привыкли).
 */
export function getDefaultVoiceForLocale(locale: string, userVoices: Voice[] = []): string {
  if (locale === 'ru') return 'fish-voice-1' // Mita
  const all = [...BUILTIN_VOICES, ...userVoices]
  const match = all.find((v) => v.langs?.[0] === locale)
  if (match) return match.id
  // Fallback если для локали нет ни одного голоса
  return 'eleven-kika'
}

const STORAGE_KEY = 'kika:user-voices:v1'

export function loadUserVoices(): Voice[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Voice[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveUserVoices(voices: Voice[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(voices))
}

export function getAllVoices(userVoices: Voice[]): Voice[] {
  return [...BUILTIN_VOICES, ...userVoices]
}

export function findVoice(id: string, userVoices: Voice[]): Voice {
  return getAllVoices(userVoices).find((v) => v.id === id) ?? BUILTIN_VOICES[0]
}
