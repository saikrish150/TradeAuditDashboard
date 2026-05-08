import React, { useState, useRef, useEffect } from 'react';

// Comprehensive English + Trading dictionary
const DICTIONARY = [
  "about","above","accept","according","account","across","action","activity","actually","added",
  "after","again","against","ahead","already","also","always","among","amount","analysis",
  "another","answer","approach","area","around","away","back","based","because","become",
  "been","before","began","behind","being","below","best","better","between","beyond",
  "both","bought","break","breakout","breakdown","bring","broke","broken","build","building",
  "but","called","came","can","capital","carefully","carried","caught","cause","certain",
  "chance","change","changed","check","clear","close","closed","closing","come","coming",
  "company","compared","completely","condition","confident","confirm","confirmation","consider",
  "consistent","continue","control","correct","correction","could","counter","create","current",
  "daily","data","day","days","decided","decision","deep","demand","deviation","did","different",
  "difficult","direction","discipline","disciplined","divergence","does","doing","done","down",
  "downside","downtrend","draw","drawn","driven","drop","dropped","during","each","early",
  "easy","economic","edge","effect","either","else","emotional","emotions","end","ended",
  "enter","entered","entire","entry","equal","error","especially","established","even","event",
  "every","everything","evidence","exactly","example","excellent","except","exchange","execution",
  "exit","exited","expect","expected","experience","explained","exposure","extended","extreme",
  "fact","factor","failed","failure","fair","fall","falling","false","far","fast","fear",
  "feel","feeling","few","fibonacci","fill","filled","final","finally","find","finding",
  "first","flat","flow","focus","focused","follow","followed","following","force","formation",
  "found","four","from","front","full","fully","fundamental","further","future","gain",
  "gap","gapped","gave","general","get","getting","give","given","global","goes","going",
  "gold","good","got","great","green","greed","greedy","gross","ground","group","grow",
  "growing","growth","had","half","hand","happened","happy","hard","has","have","having",
  "head","hedge","hedging","held","help","here","high","higher","highest","highly","hit",
  "hold","holding","hope","hour","hourly","how","however","huge","idea","identified",
  "identify","immediately","impact","important","improve","improvement","impulse","include",
  "increase","increased","index","indicate","indicated","indicator","indicators","individual",
  "initial","inside","instead","interest","into","invalidated","invest","investment","issue",
  "just","keep","keeping","kept","key","kind","knew","know","knowledge","known",
  "lack","large","larger","last","late","later","lead","leading","learn","learned","learning",
  "least","leave","left","less","lesson","let","level","levels","leverage","light","like",
  "likely","limit","line","liquidity","list","little","live","long","longer","look","looked",
  "looking","loss","losses","lost","lot","lots","low","lower","lowest","luck","made",
  "maintain","major","make","making","manage","managed","management","many","margin","mark",
  "market","markets","massive","matter","maximum","mean","means","measured","medium",
  "met","method","might","mind","mindset","minimum","minor","minute","minutes","miss",
  "missed","mistake","mistakes","model","momentum","money","month","monthly","more","morning",
  "most","move","moved","movement","moving","much","multiple","must","near","necessary",
  "need","needed","negative","net","never","new","news","next","nice","night","noise",
  "none","normal","not","note","noted","nothing","notice","noticed","now","number",
  "objective","observation","observed","obvious","occurred","off","offer","often","once",
  "one","only","open","opened","opening","opinion","opportunity","opposite","option","options",
  "order","orders","other","otherwise","out","outcome","outside","over","overall","overbought",
  "overconfident","overexposed","overleveraged","oversold","overtrade","overtraded","overtrading",
  "own","paid","pair","panic","panicked","part","partial","partially","particular","pass",
  "past","patience","patient","pattern","patterns","pay","peak","per","percent","perfect",
  "perfectly","performance","period","personally","pick","pivot","place","placed","plan",
  "planned","planning","play","played","point","points","poor","poorly","position","positions",
  "positive","possible","potential","power","practice","precisely","prediction","premium",
  "preparation","prepared","present","pressure","pretty","previous","previously","price",
  "prices","primary","principle","probability","probable","probably","problem","process",
  "profit","profitable","profits","program","proper","properly","protect","protection",
  "proved","provide","pull","pullback","pulled","purpose","push","pushed","put","quality",
  "question","quick","quickly","quite","rally","range","ranging","rate","rather","ratio",
  "reach","reached","reaction","read","reading","ready","real","realistic","realize","really",
  "reason","reasonable","recent","recently","recognize","record","recovery","red","reduce",
  "reduced","rejection","related","relative","remain","remember","remove","repeat","repeated",
  "report","required","resistance","respect","responded","response","rest","result","results",
  "retrace","retracement","return","returns","reversal","reverse","reversed","review","reward",
  "right","rise","rising","risk","risked","rode","role","room","rule","rules","run","running",
  "safe","same","saw","scale","scaled","scalp","scalping","scenario","screen","second",
  "sector","see","seeing","seem","seemed","seen","sell","selling","send","sense","sentiment",
  "series","serious","session","set","setup","setups","several","sharp","short","shorter",
  "should","show","showed","showing","side","sideways","signal","signals","significant",
  "similar","simple","simply","since","single","situation","size","sized","sizing","skill",
  "slight","slightly","slow","slowly","small","smaller","smart","sold","solid","solution",
  "some","something","soon","sort","source","specific","speed","spent","spike","spiked",
  "spot","spread","stability","stable","stage","standard","start","started","starting",
  "state","stay","stayed","steady","step","still","stock","stocks","stop","stoploss",
  "stopped","straight","strategy","strength","strong","stronger","strongest","structure",
  "stuck","study","style","subject","substantial","success","successful","successfully",
  "such","sudden","suddenly","suffer","suggest","supply","support","sure","surprise",
  "swing","swinging","switch","symbol","system","systematic","take","taken","taking",
  "target","targets","technical","tell","tend","tendency","term","test","tested","testing",
  "than","that","the","their","them","then","there","therefore","these","they","thing",
  "think","thinking","this","those","though","thought","three","through","throughout",
  "tick","ticks","tight","tighter","till","time","timeframe","times","timing","today",
  "together","told","too","took","top","total","towards","track","trade","traded","trader",
  "trades","trading","trail","trailed","trailing","train","training","transaction","trap",
  "trapped","trend","trending","trendline","trends","tried","trigger","triggered","trouble",
  "true","try","trying","turn","turned","turning","twice","two","type","typical",
  "ultimately","unable","uncertain","uncertainty","under","understand","understanding",
  "unexpected","unfortunately","unless","unlikely","until","unusual","upon","upper","upside",
  "uptrend","used","using","usually","valid","validated","value","very","view","visible",
  "volatile","volatility","volume","volumes","wait","waited","waiting","want","wanted",
  "warning","was","watch","watched","watching","way","weak","weaker","weakness","week",
  "weekly","well","went","were","what","when","where","whether","which","while","whole",
  "why","wide","wider","will","win","winner","winning","with","within","without","won",
  "work","worked","working","works","worse","worst","worth","would","wrong","year",
  "years","yet","yield","zone","zones",
  "ascending","bearish","bullish","candlestick","channel","consolidation","crossover",
  "cup","doji","double","downward","dragonfly","engulfing","evening","exhaustion",
  "exponential","fibonacci","flag","gap","gartley","gravestone","hammer","handle",
  "hanging","harami","harmonic","ichimoku","inside","inverted","island","kicker",
  "macd","marubozu","morning","neckline","pennant","piercing","rectangle","rsi",
  "shooting","star","stochastic","symmetrical","triangle","tweezer","upward","vwap",
  "wedge","wick","williams",
  "nifty","banknifty","sensex","finnifty","expiry","premium","strike","theta","delta",
  "gamma","vega","intrinsic","extrinsic","hedge","straddle","strangle","iron","condor",
  "butterfly","collar","covered","naked","assignment","exercise","rollover","settlement",
  "lot","lots","contracts","intraday","positional","delivery","equity","futures","commodity",
  "crude","silver","copper","natural","rupee","dollar","yen","euro","pound"
];

const AutoSuggestTextarea = ({ value, onChange, placeholder, className }) => {
  const [ghostSuffix, setGhostSuffix] = useState('');
  const textareaRef = useRef(null);
  const mirrorRef = useRef(null);

  // Get the current word being typed at cursor
  const getCurrentWord = (text) => {
    if (!text) return '';
    const cursorPos = textareaRef.current?.selectionStart || text.length;
    const textBeforeCursor = text.substring(0, cursorPos);
    const match = textBeforeCursor.match(/[a-zA-Z]+$/);
    return match ? match[0] : '';
  };

  // Find best suggestion for current word
  useEffect(() => {
    const currentWord = getCurrentWord(value);
    if (currentWord.length < 2) {
      setGhostSuffix('');
      return;
    }
    const lower = currentWord.toLowerCase();
    const match = DICTIONARY.find(w => w.startsWith(lower) && w !== lower);
    if (match) {
      setGhostSuffix(match.substring(currentWord.length));
    } else {
      setGhostSuffix('');
    }
  }, [value]);

  // Accept ghost suggestion on Tab
  const handleKeyDown = (e) => {
    if (e.key === 'Tab' && ghostSuffix) {
      e.preventDefault();
      const cursorPos = textareaRef.current?.selectionStart || (value || '').length;
      const text = value || '';
      const newText = text.substring(0, cursorPos) + ghostSuffix + ' ' + text.substring(cursorPos);
      onChange(newText);
      setGhostSuffix('');
      // Move cursor to after the completed word
      setTimeout(() => {
        const newPos = cursorPos + ghostSuffix.length + 1;
        textareaRef.current?.setSelectionRange(newPos, newPos);
        textareaRef.current?.focus();
      }, 0);
    }
  };

  return (
    <div className="relative">
      {/* Ghost text overlay — sits behind the textarea */}
      <div
        ref={mirrorRef}
        aria-hidden="true"
        className={className}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          color: 'transparent',
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          zIndex: 1,
        }}
      >
        {/* Invisible real text */}
        <span style={{ visibility: 'hidden' }}>{value || ''}</span>
        {/* Visible ghost suffix */}
        {ghostSuffix && (
          <span style={{ visibility: 'visible', color: 'rgba(212,175,55,0.35)', fontStyle: 'italic' }}>
            {ghostSuffix}
          </span>
        )}
      </div>

      {/* Actual textarea on top */}
      <textarea
        ref={textareaRef}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        style={{ position: 'relative', zIndex: 2, background: 'transparent' }}
      />
    </div>
  );
};

export default AutoSuggestTextarea;
