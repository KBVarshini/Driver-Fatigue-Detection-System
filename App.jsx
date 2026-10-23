// Student Name: Brunda Varshini Katapalli

/* SCREENS IN THIS FILE:
   Screen 1 --> Home Page / Landing Page.
   Screen 2 --> OAuth login (Apple / Google).
   Screen 3 --> Email + Password Login Form.
   Screen 4 --> Instructions (before monitoring starts).
   Screen 5 --> Camera permission request.
   Screen 6-8 --> Live monitoring (Alert, Low Vigilant, Drowsy states).
   Screen 9 --> Session End + Email report.
*/

// ------------------------------------------------------------------------------------------

/* React hooks we used:
   useState: Stores data that can change (e.g. which screen we're on).
   useEffect: Runs code when something changes (e.g. start a timer).
   useRef: Holds a reference to something without causing re-renders.
              (we use this to store the interval timer ID). */
import { useState, useEffect, useRef } from "react";


// We will be using the designed logo as the app logo.
// We have to import the .png file.
import appLogo from './App Logo.png';


// // Test users for demo purposes.
// DUMMY EMAIL ACCOUNT CREATED.
const TEST_USERS = [
  { email: "demo@example.com", password: "demo-password", name: "Demo User" },

];

// --------------------------------------------- COLOURS --------------------------------------------
// All colours defined in one place so we can change them easily.
// These match the navy/teal theme from the Part D Figma design.

const COLORS = {
  navy: "#d6dbee", // Main background.
  navyLight: "#d2d6ed", // Slightly lighter navy for cards.

  purple: "#731993", // Primary accent (buttons, highlights).s
  greenDim:  "#2fcb87d5", // Lighter purple for hover states.

  blue: "#1A6EFF", // Secondary accent.
  blueDim: "#1456CC", // Darker blue for hover states.

  alert: "#00C851", // Green - Driver is alert/focused.
  warning: "#FFB300", // Orange — Low vigilance warning.

  danger: "#FF3B30", // Red — Drowsy / action required.
  white: "#FFFFFF",

  black: "#000000",
  offwhite:  "#E8EDF8", // Softer white for body text.

  muted: "#8A9CC4", // Grey-blue for labels and secondary text.
  card: "rgba(255,255,255,0.05)",  // Transparent white for card backgrounds.

  cardBorder: "rgba(255,255,255,0.10)", // Subtle border for cards.

  // LOGIN BUTTONS (Continue via Apple, Google).
  // ONLY EMAILS ACCEPTED.
  oauthBg: "#731993",
  oauthAppleText: "#999999",
  oauthAppleHover: "#885ad3d5",
  oauthGoogleText: "#e47a70",
  oauthGoogleHover: "#885ad3d5",
  

};

// ------------------------------------------- FONTS -----------------------------------------------------
// We import two Google Fonts:
//   Syne font: Bold display font for headings and status labels.
//   DM Sans font: Clean, readable font for body text and inputs.
// -------------------------------------------------------------------------------------------------------

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
`;

// ----------------------------------------- GLOBAL CSS + ANIMATIONS ------------------------------------------
// These styles apply to the whole app. We define all our CSS animations here:

/*   fadeUp  — elements slide up and fade in when a screen loads.
//   pulseRing — glowing ring around the user avatar (shows active session).
//   scan  — a horizontal line that sweeps across the camera previe.
//   blink — Random stars blinking in the background.
//   shake — The status label shakes when the driver is DROWSY.
//   float — The logo gently bobs up and down on the home screen.
//   heatPulse — The Grad-CAM heatmap gently pulses to show it's live.
*/

const globalStyle = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${COLORS.navy}; font-family: 'DM Sans', sans-serif; color: ${COLORS.white}; }
  input { outline: none; }
  button { cursor: pointer; border: none; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulseRing {
    0%   { box-shadow: 0 0 0 0 rgba(0,201,177,0.4); }
    70%  { box-shadow: 0 0 0 14px rgba(0,201,177,0); }
    100% { box-shadow: 0 0 0 0 rgba(0,201,177,0); }
  }
  @keyframes scan {
    0%   { top: 10%; opacity: 0.7; }
    50%  { opacity: 1; }
    100% { top: 90%; opacity: 0.7; }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%     { transform: translateX(-8px); }
    40%     { transform: translateX(8px); }
    60%     { transform: translateX(-5px); }
    80%     { transform: translateX(5px); }
  }
  @keyframes gradientShift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-8px); }
  }
  @keyframes heatPulse {
    0%,100% { opacity: 0.85; }
    50%      { opacity: 1; }
  }

  /* Staggered fade-in classes — each one delays slightly more than the last */
  .fade-up   { animation: fadeUp 0.5s ease forwards; }
  .fade-up-1 { animation: fadeUp 0.5s 0.1s ease both; }
  .fade-up-2 { animation: fadeUp 0.5s 0.2s ease both; }
  .fade-up-3 { animation: fadeUp 0.5s 0.3s ease both; }
  .fade-up-4 { animation: fadeUp 0.5s 0.4s ease both; }
  .fade-up-5 { animation: fadeUp 0.5s 0.5s ease both; }
`;

// ---------------------------------------------------- SHARED UI COMPONENTS ----------------------------------------------
// These are reusable building blocks used across multiple screens.
// Building them once here means we don't repeat the same styling everywhere.

// BG = Animated background with gradient + blinking stars.
// If the content scrolls. pointerEvents:none means clicks pass through it.
const BG = () => (
  <div style={{ position:"fixed", inset:0, zIndex:0, overflow:"hidden", pointerEvents:"none" }}>
    {/* Dark navy gradient with subtle teal and blue glows in the corners */}
    <div style={{ position:"absolute", inset:0,
      background:`radial-gradient(ellipse 80% 60% at 70% 20%, rgba(0,201,177,0.12) 0%, transparent 60%),
                  radial-gradient(ellipse 60% 50% at 20% 80%, rgba(26,110,255,0.10) 0%, transparent 60%),
                  linear-gradient(160deg, #b0b6d5 0%, #1c3693 50%, #05133a 100%)` }} />

    {/* 20 tiny random dots (STARS) placed around the screen, each blinking at different speeds */}
    {[...Array(20)].map((_,i)=>(
      <div key={i} style={{
        position:"absolute",
        width: 2+Math.random()*3+"px",
        height: 2+Math.random()*3+"px",
        borderRadius:"50%",
        background:"rgb(255, 255, 255)",
        left: Math.random()*100+"%",
        top:  Math.random()*100+"%",
        animation: `blink ${2+Math.random()*3}s ${Math.random()*3}s infinite`
      }}/>
    ))}
  </div>
);

// ------------------------------------------------ LOGO --------------------------------------------------------
// Logo --> The VigiDrive brand mark with car icon + name.
// We can ajust how big we want the logo to be on INDIVIDUAL SCREENS. 
const Logo = ({ size = 40 }) => (
  <div style={{ display:"flex", justifyContent:"center", alignItems:"center", width:"100%" }}>
    <img
      src={appLogo}
      alt="VigiDrive Logo"
      style={{
        width: size,
        height: "auto",
        objectFit: "contain",
        maxWidth: "100%",
      }}
    />
  </div>
);


// ---------------------------------------------- BUTTONS -------------------------------------------------------
//   Primary --> Solid teal (main action)
//   Secondary --> Transparent with border (less important action)
//   Danger --> Solid red (destructive action like "End Session")
//   Ghost --> Transparent with teal border (subtle back/nav buttons)
//
// The hover state is tracked with useState so we can change colour on hover.
// 'disabled' greys it out and prevents clicks.
const Btn = ({ children, onClick, variant="primary", style={}, disabled=false }) => {
  const [hover, setHover] = useState(false); // tracks whether mouse is over the button

  const base = {
    width:"100%", padding:"14px 20px", borderRadius:12,
    fontFamily:"'DM Sans',sans-serif", fontWeight:500, fontSize:15,
    transition:"all 0.2s",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,

  };

  // Each variant defines its own background and text colour.
  const styles = {
  primary:   { background: hover && !disabled ? COLORS.greenDim : COLORS.purple, color: COLORS.navy },
  secondary: { background: hover && !disabled ? COLORS.greenDim : "rgba(255,255,255,0.07)",
               color: COLORS.white, border:`1px solid ${COLORS.cardBorder}` },
  danger:    { background: hover && !disabled ? "#ed5645" : COLORS.danger, color: COLORS.white },
  ghost:     { background: hover && !disabled ? "rgba(144, 0, 201, 0.08)" : "transparent",
               color: COLORS.purple, border:`1px solid ${COLORS.purple}` },

  back:      { background: hover && !disabled ? "#bb3e3e" : "#885ad3d5",
               color: "#ffffff", border:"none" },

  deny:      { background: hover && !disabled ? "#c0392b" : "rgba(255,59,48,0.2)",
               color: hover && !disabled ? COLORS.white : COLORS.danger,
               border:`1px solid ${COLORS.danger}` },
};


  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={()=>setHover(true)}
      onMouseLeave={()=>setHover(false)}
      style={{...base, ...styles[variant], ...style}}>
      {children}
    </button>
  );
};

// Input — Styled text/password input field with a label above it.
// The border changes to teal when the user clicks into it (onFocus)
// and goes back to the default border when they click away (onBlur).
const Input = ({ label, type="text", value, onChange, placeholder }) => (
  <div style={{ marginBottom:16 }}>
    {/* Only render the label if one was provided */}
    {label && <div style={{ fontSize:13, color:COLORS.muted, marginBottom:6, fontWeight:500 }}>{label}</div>}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width:"100%", padding:"12px 16px",
        background:"rgba(255,255,255,0.06)",
        border:`1px solid ${COLORS.cardBorder}`,
        borderRadius:10, color:COLORS.white,
        fontSize:15, fontFamily:"'DM Sans',sans-serif",
        transition:"border 0.2s",
      }}
      onFocus={e=>e.target.style.borderColor=COLORS.purple}   // Highlight border on focus.
      onBlur ={e=>e.target.style.borderColor=COLORS.cardBorder} // Reset border on blur.
    />
  </div>
);

// Card — Frosted glass container used to group content on each screen.
// backdropFilter:blur creates a blurred glass effect over the BG behind it.
const Card = ({ children, style={} }) => (
  <div style={{
    background:"rgba(255,255,255,0.04)",
    border:`1px solid ${COLORS.cardBorder}`,
    borderRadius:20,
    backdropFilter:"blur(20px)",
    ...style // allow the caller to pass extra styles (padding, margin, etc.)
  }}>
    {children}
  </div>
);

// Divider — A horizontal line, optionally with a label in the middle.
// Used between OAuth buttons and the email login option.
const Divider = ({ label }) => (
  <div style={{ display:"flex", alignItems:"center", gap:12, margin:"20px 0" }}>
    <div style={{ flex:1, height:1, background:COLORS.cardBorder }}/>
    {label && <span style={{ fontSize:12, color:COLORS.muted }}>{label}</span>}
    <div style={{ flex:1, height:1, background:COLORS.cardBorder }}/>
  </div>
);

// ---------------------------------------------------- SCREEN 1 — HOME PAGE ----------------------------------------------------
// The landing screen. Shows the logo, tagline, and two buttons:
// Login and Create an account.
// onNav is a function passed in from the App router to switch screens.
const HomeScreen = ({ onNav }) => (
  <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column",
    alignItems:"center", justifyContent:"center", position:"relative", padding:24 }}>
    <BG/>
    <div style={{ position:"relative", zIndex:1, textAlign:"center", maxWidth:400, width:"100%" }}>

      {/* "Welcome To VigiDrive" ABOVE the logo */}
      <h1
      className="fade-up-1"
      style={{
      fontFamily:"'Syne',sans-serif",
      fontSize:35,
      fontWeight:730,
      lineHeight:1.2,
      marginBottom:12,
      letterSpacing:"-0.03em",
      whiteSpace:"nowrap",
      marginLeft:"-80px"
  }}
>
  Welcome To <span style={{ color:COLORS.purple }}>VigiDrive</span>
</h1>
    
      {/* Logo in the middle */}
      <div className="fade-up-2" style={{ marginBottom:-100, animation:"float 4s ease-in-out infinite" }}>
        <Logo size={300}/>
      </div>

      {/* Text BELOW logo --> "Your Real-Time..." */}
      <p className="fade-up-3" style={{ color:COLORS.white, fontSize:18, marginBottom:32, lineHeight:1.4 }}>
        Your Real-Time Driving Monitoring System
      </p>

      {/* Buttons */}
      <div className="fade-up-4" style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <Btn onClick={()=>onNav("oauth")}>Login</Btn>

        {/*Should redirect to Google to Create account*/}
        <Btn onClick={()=>window.open("https://accounts.google.com/signup", "_blank")} variant="secondary">
        Create an account
        </Btn>
    
      </div>

      {/* Terms of Service ... */}
      <p className="fade-up-5" style={{ marginTop:24, fontSize:12, color:COLORS.muted }}>
        By continuing, you accept our{" "}
        <span style={{ color:COLORS.white, cursor:"pointer" }}>Terms of Service and Privacy Policy</span>
      </p>
    </div>
  </div>
);

// ------------------------------------------ SCREEN 2 — LOGIN PAGE ----------------------------------------------
/* Offers social login options (Apple, Google) as well as a fallback to 
email login. Each button navigates to the email login form.
*/

const OAuthScreen = ({ onNav }) => (
  <div
    style={{
      minHeight:"100vh",
      display:"flex",
      flexDirection:"column",
      alignItems:"center",
      justifyContent:"center",
      position:"relative",
      padding:-15
    }}
  >
    <BG/>

    <div
      style={{
        position:"relative",
        zIndex:1,
        maxWidth:400,
        width:"100%",
        textAlign:"center"
      }}
    >

      {/* HEADING */}
      <h1
        className="fade-up-1"
        style={{
          fontFamily:"'Syne',sans-serif",
          fontSize:35,
          fontWeight:730,
          lineHeight:1.2,
          marginBottom:12,
          letterSpacing:"-0.03em",
          whiteSpace:"nowrap",
          marginLeft:"-80px"
        }}
      >
        Welcome To{" "}
        <span style={{ color:COLORS.purple }}>
          VigiDrive
        </span>
      </h1>

      {/* LOGO */}
      <div
        className="fade-up-2"
        style={{
          marginBottom:-120,
          animation:"float 4s ease-in-out infinite"
        }}
      >
        <Logo size={300}/>
      </div>

      {/* SUBTITLE */}
      <p
        className="fade-up-3"
        style={{
          color:COLORS.white,
          fontSize:18,
          marginBottom:32,
          lineHeight:1.4
        }}
      >
        Your Real-Time Driving Monitoring System
      </p>

      {/* SOCIAL LOGIN BUTTONS */}
      <div
        className="fade-up-4"
        style={{
          display:"flex",
          flexDirection:"column",
          gap:12
        }}
      >

{[
          {
            label:"Continue via Apple",
            textColor: COLORS.oauthAppleText,
            hoverBg: COLORS.oauthAppleHover,
            defaultBg: COLORS.oauthBg
          },
          {
            label:"Continue via Google",
            textColor: COLORS.oauthGoogleText,
            hoverBg: COLORS.oauthGoogleHover,
            defaultBg: COLORS.oauthBg
          },

        ].map(({ label, textColor, hoverBg, defaultBg }) => (

          <button
            key={label}
            onClick={()=>onNav("login-form")}
            style={{
              width:"100%",
              padding:"14px 20px",
              borderRadius:"50px",
              background: defaultBg,
              border:"none",
              fontSize:16,
              fontFamily:"'DM Sans',sans-serif",
              fontWeight:500,
              color:textColor,
              display:"flex",
              justifyContent:"center",
              alignItems:"center",
              cursor:"pointer",
              transition:"all 0.2s ease",
              boxShadow:"0 4px 15px rgba(0,0,0,0.1)"
            }}
            onMouseEnter={e=>{
              e.currentTarget.style.transform="translateY(-2px)";
              e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.15)";
              e.currentTarget.style.background=hoverBg;
            }}
            onMouseLeave={e=>{
              e.currentTarget.style.transform="translateY(0px)";
              e.currentTarget.style.boxShadow="0 4px 15px rgba(0,0,0,0.1)";
              e.currentTarget.style.background=defaultBg;
            }}
          >
            {label}
          </button>
        ))}

      </div>

      {/* BACK BUTTON */}
      <div 
      style={{ display:"flex", 
      justifyContent:"flex-end", 
      marginTop:20, 
      marginRight:"-60px" }}>
  <Btn onClick={()=>onNav("home")} variant="back" 
  style={{ width:"auto", 
  padding:"10px 24px" }}>
          ⇦ Back
        </Btn>
      </div>


    </div>
  </div>
);

// ---------------------------------------------------- SCREEN 3 — EMAIL / PASSWORD LOGIN PAGE ---------------------------------------------------- 
// Standard login form. 
// The Sign In button is disabled if the user hasn't agreed to Terms & Conditions (the checkbox).
const LoginScreen = ({ onNav }) => {
  // State for each form field
  const [email, setEmail]   = useState(""); // Pre-filled for demo.
  const [password,setPassword]= useState("");  // Pre-filled for demo.
  const [agreed, setAgreed]  = useState(true); // Checkbox state — starts unchecked so Sign In is disabled until user ticks it.

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", position:"relative", padding:24 }}>
      <BG/>
      <div style={{ position:"relative", zIndex:1, maxWidth:400, width:"100%" }}>

        <div style={{ marginBottom:-120 }}><Logo size={300}/></div>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:700, marginBottom:28 }}>Login</h2>

        {/* Email and password fields using our reusable Input component */}
        <Input label="Email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com"/>
        <Input label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/>

        {/* Terms & Conditions checkbox — Sign In is disabled unless this is checked */}
        <label style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24,
          cursor:"pointer", fontSize:14, color:COLORS.muted }}>
          <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}
            style={{ accentColor:COLORS.purple, width:16, height:16 }}/>
          I agree to the Terms &amp; Conditions
        </label>

        {/* Sign In,  disabled if checkbox not ticked. On success, goes to instructions. */}
        <Btn onClick={()=>onNav("instructions")} disabled={!agreed}>Sign In</Btn>

        {/* Redirects to Google to update their password. */}
        <p onClick={()=>window.open("https://accounts.google.com/signin/recovery", "_blank")} 
        style={{ textAlign:"center", marginTop:16, fontSize:13, color:COLORS.white, cursor:"pointer" }}
        onMouseEnter={e=>{ e.target.style.textDecoration="underline"; }}
        onMouseLeave={e=>{ e.target.style.textDecoration="none"; }}>
        Forgot Password?
        </p>

        
        <Divider/>

        {/* Link/Redirect user to register screen for new users */}
        <div style={{ textAlign:"center", fontSize:13}}>
          <span
    style={{
      color: COLORS.white,
      cursor: "pointer",
      transition: "color 0.2s",
      textDecoration: "underline"
    }}
    onMouseEnter={e=>{
      e.target.style.color = "#1A6EFF";
    }}
    onMouseLeave={e=>{
      e.target.style.color = COLORS.white;
    }}

    onClick={()=>window.open("https://accounts.google.com/signup", "_blank")}
  >
    No Account? Create one
  </span>
  
   {/* BACK BUTTON */}
      <div 
      style={{ display:"flex", 
      justifyContent:"flex-end", 
      marginTop:20, 
      marginRight:"-60px" }}>
  <Btn onClick={()=>onNav("home")} variant="back" 
  style={{ width:"auto", 
  padding:"10px 24px" }}>
          ⇦ Back
        </Btn>
      </div>
</div>    


</div>
    </div>
  )
};


// --------------------------------------------------- SCREEN 4 — INSTRUCTIONS PAGE ---------------------------------------------
// Shown after login, before the camera is activated.
// Tells the user how to position themselves for accurate detection.
const InstructionsScreen = ({ onNav }) => {
  // Each checklist item has an icon and text.
  const items = [
    { icon:"🦱", text:"Face is clearly visible to camera." },
    { icon:"☼", text:"Well-lit environment." },
    { icon:"📷", text:"Allow camera access when prompted." },
    { icon:"💺", text:"Seated properly and ready to drive." },
    { icon:"😳🕶🤏", text:"Remove sunglasses if worn." },
  ];

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", position:"relative", padding:24 }}>
      <BG/>
      <div style={{ position:"relative", zIndex:1, maxWidth:480, width:"100%" }}>

        {/* Top nav bar: logo on the left, user avatar on the right */}
        <div className="fade-up-2" style={{ marginTop: -70, marginBottom:-140, animation:"float 4s ease-in-out infinite" }}>
        <Logo size={300}/>
      </div>
        

        <Card style={{ padding:28 }}>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:700,marginTop: -15, marginBottom:8 }}>
            Instructions ⚠️
          </h2>
          <p style={{ color:COLORS.black, fontSize:14, marginBottom:24, lineHeight:1.4 }}>
            Before starting, ensure you are seated properly and ready to drive.
            The system will monitor your alertness in real time to help keep you safe on the road.
          </p>

          {/* Render each checklist item from the array above */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {items.map(({ icon, text })=>(
              <div key={text} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"12px 16px", background:"rgba(255,255,255,0.04)",
                borderRadius:10, border:`1px solid ${COLORS.cardBorder}`
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:20 }}>{icon}</span>
                  <span style={{ fontSize:14 }}>{text}</span>
                </div>
                {/* Teal tick on the right of each item */}
                <span style={{ color:COLORS.white, fontWeight:700 }}>✓</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Back , Next buttons */}
        <div style={{ display:"flex", justifyContent:"flex-end", marginTop:20, gap:12 }}>

          <Btn onClick={()=>onNav("login-form")} variant ="back" style={{ width:"auto", padding:"12px 24px" }}>⇦ Back</Btn>
          <Btn onClick={()=>onNav("camera-permissions")} style={{ width:"auto", padding:"12px 24px" }}>Next ⇨ </Btn>
        </div>
      </div>
    </div>
  );
};


// ---------------------------------------------------------- SCREEN 5 — CAMERA PERMISSIONS -----------------------------------------------
// Opens the real device camera and overlays a face outline guide.
// Uses the browser FaceDetector API (Chrome/Edge) to check if the face is
// centred and large enough (eyes, mouth, forehead in frame).
// If aligned → auto-navigates to monitoring after 1.5s.
// If FaceDetector is unavailable (Firefox/Safari) → falls back to auto-proceed after 3s.
// Deny → shows error with Try Again option.

const CameraPermissionsScreen = ({ onNav, onStreamReady }) => {
  const [denied,      setDenied]      = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceAligned, setFaceAligned] = useState(false);
  const [alignMsg,    setAlignMsg]    = useState("Position your face in the outline...");
  const [loading,     setLoading]     = useState(false);

  const videoRef         = useRef(null);
  const streamRef        = useRef(null);
  const animFrameRef     = useRef(null);
  const faceMeshRef      = useRef(null);
  const canvasRef        = useRef(null);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);

    };
  }, []);

  useEffect(() => {
    if (cameraReady && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play();
    }
  }, [cameraReady]);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      onStreamReady(stream); // pass to App so MonitoringScreen can reuse it
      setCameraReady(true);
      setLoading(false);
      // Wait for video element to be ready
      setTimeout(() => startFaceMesh(), 300);
    } catch (err) {
      setLoading(false);
      setDenied(true);
    }
  };

  const startFaceMesh = async () => {
    // Dynamically load MediaPipe FaceMesh from CDN
    if (!window.FaceMesh) {
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js");
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
    }

    const faceMesh = new window.FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    faceMesh.onResults(onFaceResults);
    faceMeshRef.current = faceMesh;

    // Use MediaPipe Camera util to feed frames
    const camera = new window.Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current) {
          await faceMesh.send({ image: videoRef.current });
        }
      },
      width: 640,
      height: 480,
    });
    camera.start();
  };

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

  const onFaceResults = (results) => {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      setAlignMsg("No face detected. Move closer.");
      setFaceAligned(false);
      return;
    }

    const lm = results.multiFaceLandmarks[0];

    // --- Key landmark indices (MediaPipe 468-point mesh) ---
    // Nose tip: 1
    // Left eye centre: 159, Right eye centre: 386
    // Left eye inner corner: 133, Right eye inner corner: 362
    // Forehead (approx): 10
    // Mouth centre: 13

    const noseTip    = lm[1];
    const leftEye    = lm[159];
    const rightEye   = lm[386];
    const leftInner  = lm[133];
    const rightInner = lm[362];
    const forehead   = lm[10];
    const mouth      = lm[13];

    // All coords are normalised 0–1

    // FACE CENTRED — nose tip should be near horizontal centre
    const noseX = noseTip.x;
    if (noseX < 0.35 || noseX > 0.65) {
      setAlignMsg("Centre your face.");
      setFaceAligned(false);
      return;
    }

    // VERTICAL POSITION — forehead and mouth both visible and in range
    if (forehead.y < 0.05 || mouth.y > 0.90) {
    setAlignMsg("Face not fully inside frame");
    setFaceAligned(false);
    return;
    }

    // YAW (left/right rotation) — check eye inner corners are symmetric
    //    relative to nose. If face turned, one inner corner is much closer to nose.
    const leftDist  = Math.abs(noseTip.x - leftInner.x);
    const rightDist = Math.abs(noseTip.x - rightInner.x);
    const yawRatio  = Math.min(leftDist, rightDist) / Math.max(leftDist, rightDist);
    // yawRatio close to 1.0 = straight on; drops toward 0 when turned
    if (yawRatio < 0.65) {
      setAlignMsg("Look straight at the camera.");
      setFaceAligned(false);
      return;
    }

    // PITCH (up/down tilt) — nose tip should sit between eyes and mouth vertically.
    const eyeMidY   = (leftEye.y + rightEye.y) / 2;
    const noseY     = noseTip.y;

   // Detects if user is looking down.
  const eyeToNose = noseY - eyeMidY;
  const noseToMouth = mouth.y - noseY;

// If nose gets too close to mouth vertically.
// If the head is tilted downward.
if (noseToMouth < eyeToNose * 0.55) {
  setAlignMsg("Look straight at the camera");
  setFaceAligned(false);
  return;
}

    // ROLL (head tilt sideways), eyes should be at roughly same height.
    const eyeRoll = Math.abs(leftEye.y - rightEye.y);
    if (eyeRoll > 0.04) {
      setAlignMsg("Keep your head straight. Don't tilt.");
      setFaceAligned(false);
      return;
    }

    // FACE SIZE, ensure close enough that features are properly visible.
    const faceHeight = Math.abs(forehead.y - mouth.y);

    // TOO FAR
    if (faceHeight < 0.25) {
    setAlignMsg("Move closer to the camera");
    setFaceAligned(false);
  return;
}

// TOO CLOSE
if (faceHeight > 0.55) {
  setAlignMsg("Move farther from the camera");
  setFaceAligned(false);
  return;

}


    // All checks passed!
    setFaceAligned(true);
    setAlignMsg("✔️Face aligned. Proceeding...");
    
    if (faceMeshRef.current) {
  faceMeshRef.current.onResults(() => {});
}
    setTimeout(() => onNav("monitoring"), 1500);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        padding: 24
      }}
    >
      <BG />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 480, width: "100%" }}>

        {/* LOGO */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: -100 }}>
          <Logo size={300} />
        </div>

        {/* CAMERA CONTAINER */}
        <div
          style={{
            background: "#000",
            borderRadius: 16,
            overflow: "hidden",
            position: "relative",
            marginBottom: 20,
            border: `1px solid ${COLORS.cardBorder}`
          }}
        >
          <div style={{ paddingTop: "75%", position: "relative" }}>
            <div
              style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(135deg, #0a0a1a, #111130)"
              }}
            >

              {/* CAMERA ICON, before accept */}
              {!denied && !cameraReady && !loading && (
                <div style={{ fontSize: 48 }}>📷</div>
              )}

              {/* LOADING */}
              {loading && (
                <div style={{ color: COLORS.muted, fontSize: 14 }}>Starting camera...</div>
              )}

              {/* LIVE FEED + OVERLAY */}
              {cameraReady && (
                <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>

                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%", height: "100%",
                      objectFit: "cover",
                      transform: "scaleX(-1)"
                    }}
                  />

                  {/* Hidden canvas (reserved for future frame processing if needed) */}
                  <canvas ref={canvasRef} style={{ display: "none" }} />

                  {/* FACE OUTLINE */}
                  <div style={{
                    position: "absolute", top: "22%", left: "50%",
                    transform: "translateX(-50%)",
                    width: 150, height: 190,
                    border: `3px solid ${faceAligned ? "#00FF99" : "#FFB300"}`,
                    borderRadius: "50%", transition: "border-color 0.4s"
                  }} />

                  {/* LEFT EYE DOT */}
                  <div style={{
                    position: "absolute", top: "41%", left: "43%",
                    width: 12, height: 12,
                    background: faceAligned ? "#00FF99" : "#FFB300",
                    borderRadius: "50%", transition: "background 0.4s"
                  }} />

                  {/* RIGHT EYE DOT */}
                  <div style={{
                    position: "absolute", top: "41%", left: "55%",
                    width: 12, height: 12,
                    background: faceAligned ? "#00FF99" : "#FFB300",
                    borderRadius: "50%", transition: "background 0.4s"
                  }} />

                  {/* MOUTH */}
                  <div style={{
                    position: "absolute", top: "58%", left: "50%",
                    transform: "translateX(-50%)",
                    width: 40, height: 16,
                    borderBottom: `3px solid ${faceAligned ? "#00FF99" : "#FFB300"}`,
                    borderRadius: "0 0 40px 40px", transition: "border-color 0.4s"
                  }} />

                  {/* FOREHEAD */}
                  <div style={{
                    position: "absolute", top: "31%", left: "50%",
                    transform: "translateX(-50%)",
                    width: 52, height: 20,
                    border: `2px solid ${faceAligned ? "#00FF99" : "#FFB300"}`,
                    borderRadius: 8, transition: "border-color 0.4s"
                  }} />

                  {/* SCANNING LINE */}
                  <div style={{
                    position: "absolute", left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg, transparent, ${COLORS.purple}, transparent)`,
                    animation: "scan 2.5s linear infinite"
                  }} />

                  {/* STATUS TEXT */}
                  <div style={{
                    position: "absolute", bottom: 20, width: "100%",
                    textAlign: "center", fontSize: 14, letterSpacing: 1,
                    color: faceAligned ? "#00FF99" : "#FFB300",
                    textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                    transition: "color 0.4s"
                  }}>
                    {alignMsg}
                  </div>
                </div>
              )}

              {/* SCANNING LINE — before accept */}
              {!denied && !cameraReady && !loading && (
                <div style={{
                  position: "absolute", left: 0, right: 0, height: 2,
                  background: `linear-gradient(90deg, transparent, ${COLORS.purple}, transparent)`,
                  animation: "scan 2.5s linear infinite"
                }} />
              )}
            </div>

            {/* PERMISSION MODAL */}
            {!denied && !cameraReady && !loading && (
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)"
              }}>
                <div style={{
                  background: "rgba(22,32,80,0.98)",
                  border: `1px solid ${COLORS.cardBorder}`,
                  borderRadius: 16, padding: 36, maxWidth: 520, textAlign: "center"
                }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📷</div>
                  <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, marginBottom: 8 }}>
                    Camera Access Required
                  </h3>
                  <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 16, lineHeight: 1.5 }}>
                    This app requires access to your camera to monitor driver alertness
                    in real time. Your video is used only for detection and is not stored or shared.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <Btn onClick={handleAccept} variant="primary">Accept</Btn>
                    <Btn onClick={() => setDenied(true)} variant="deny">Deny</Btn>
                  </div>
                </div>
              </div>
            )}

            {/* DENIED */}
            {denied && (
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <div style={{ textAlign: "center", padding: 20 }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🚫</div>
                  <p style={{ color: COLORS.danger, fontSize: 14 }}>
                    Camera access denied.<br />Monitoring unavailable.
                  </p>
                  <div style={{ marginTop: 12 }}>
                    <Btn onClick={() => setDenied(false)} variant="back"
                      style={{ width: "auto", padding: "10px 22px" }}>
                      Try again
                    </Btn>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BACK BUTTON */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Btn onClick={() => onNav("instructions")} variant="back"
            style={{ width: "auto", padding: "12px 24px" }}>
            ⇦ Back
          </Btn>
        </div>
      </div>
    </div>
  );
};


// -------------------------------------------------- SCREENS 6, 7, 8 — LIVE MONITORING -----------------------------------------------------
// Real-time camera feed with MediaPipe facial landmarks + CNN drowsiness detection.
// Shows three driver states:
//   ALERT       (green)  — Eyes open, focused, good head posture.
//   LOW VIGILANT (amber) — Eyes slightly closed, head tilting, early fatigue signs.
//   DROWSY      (red)    — Eyes mostly closed, yawning, head nodding. Shows ACTION REQUIRED popup.
//
// The camera feed displays:
//   - In "normal" mode: facial landmark dots (simulated MediaPipe output).
//   - In "grad-cam" mode: a heatmap showing where the CNN focused when detecting drowsiness.
//
// Features:
//   - Real-time session timer (MM:SS format).
//   - Frame counter (increments once per second in this demo; real value from your model in production).
//   - View mode toggle: Normal ↔ Grad-CAM heatmap.
//   - Colour-coded status label that shakes when DROWSY.
//   - Stats panel showing EAR (Eye Aspect Ratio), MAR (Mouth Aspect Ratio), head pitch.
//   - Demo button row to simulate each driver state (for testing without a real camera).
//   - ACTION REQUIRED overlay (appears 800ms after DROWSY is detected).
const MonitoringScreen = ({ onNav, stream }) => {
  // BACKEND URL
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

// Map backend label --> Frontend status.
const labelMap = {
  "Alert":        "ALERT",
  "Low Vigilant": "LOW_VIGILANT",
  "Drowsy":       "DROWSY",
};

// Canvas used to capture frames for the backend.
const canvasSendRef = useRef(null);
const lastSentRef   = useRef(0);

// Sends a webcam frame to the FastAPI backend every 500ms.
const sendFrameToBackend = async (video) => {
  const now = Date.now();
  if (now - lastSentRef.current < 500) return; // throttle to 2fps
  lastSentRef.current = now;

  try {
    if (!canvasSendRef.current) canvasSendRef.current = document.createElement("canvas");
    const c = canvasSendRef.current;
    c.width  = 320;
    c.height = 240;
    c.getContext("2d").drawImage(video, 0, 0, 320, 240);
    const base64 = c.toDataURL("image/jpeg", 0.7);

    const res = await fetch(`${BACKEND_URL}/predict`, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ image: base64 }),
    });

    const data = await res.json();
    console.log("BACKEND RESPONSE:", data);

    setStatus(labelMap[data.final_label] ?? "ALERT");

    if (data.left_ear  != null) setLeftEAR(data.left_ear);
    if (data.right_ear != null) setRightEAR(data.right_ear);
    if (data.mar   != null)   setMAR(data.mar);
    if (data.pitch != null)   setPitch(`${data.pitch}°`);

  } catch (err) {
    // Backend unreachable — MediaPipe local values stay active.
    console.warn("Backend unreachable:", err.message);
  }
};



  // Current driver state — in production this comes from the CNN + decision fusion
  const [status, setStatus] = useState("ALERT");

  // Which view to show on the camera feed: "normal" (landmarks) or "gradcam" (heatmap)
  const [viewMode, setViewMode] = useState("normal");

  // Whether to show the ACTION REQUIRED overlay
  const [showAlert, setShowAlert] = useState(false);

  // Session timer in seconds (counts up from 0)
  const [sessionTime, setSessionTime] = useState(0);

  // Frame counter (increments every second in this demo; in production it's the real frame number)
  const [frameCount, setFrameCount] = useState(0);

  // useRef stores the timer ID so we can cancel it when the component unmounts
  const timerRef = useRef(null);

  // useRef for the video element to display webcam stream
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const analysisIntervalRef = useRef(null);

  // Real-time facial metrics from MediaPipe
  const [leftEAR, setLeftEAR] = useState(0.31);
  const [rightEAR, setRightEAR] = useState(0.29);
  const [mar, setMAR] = useState(0.14);
  const [pitch, setPitch] = useState("0°");
  const [yaw, setYaw] = useState("0°");
  const [roll, setRoll] = useState("0°");
  const [landmarks, setLandmarks] = useState([]);
  const [faceBounds, setFaceBounds] = useState(null);

  // Connect the stream to the video element when it arrives
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Simulated stats for display purposes
  const stats = {
    ALERT:        { leftEar:leftEAR, rightEar:rightEAR, mar:mar, pitch:pitch, label:"FOCUSED",      color:"#5dff7a",   borderColor:"#5dff7a"   },
    LOW_VIGILANT: { leftEar:leftEAR, rightEar:rightEAR, mar:mar, pitch:pitch, label:"LOW VIGILANT", color:"#ffb800", borderColor:"#ffb800" },
    DROWSY:       { leftEar:leftEAR, rightEar:rightEAR, mar:mar, pitch:pitch, label:"DISTRACTED",   color:"#ff4d6d",  borderColor:"#ff4d6d"  },
  };

  const cur = stats[status];

  // Start the session timer when this screen mounts
  useEffect(()=>{
    timerRef.current = setInterval(()=>{
      setSessionTime(t => t + 1);
      setFrameCount(f  => f + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Send webcam frames to the FastAPI backend every 500ms for CNN classification
useEffect(() => {
  analysisIntervalRef.current = setInterval(async () => {
    const video = videoRef.current;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) return;
    await sendFrameToBackend(video);
  }, 500);

  // Cleanup: stop the interval when the component unmounts
  return () => clearInterval(analysisIntervalRef.current);
}, []);

  // React to status changes — viewMode is NEVER auto-changed, user controls it manually
  useEffect(()=>{
    if (status === "DROWSY") {
      const t = setTimeout(()=>setShowAlert(true), 800);
      return () => clearTimeout(t);
    } else {
      setShowAlert(false);
    }
  }, [status]);

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  return (
    <div style={{ minHeight:"100vh", position:"relative", padding:16,
      display:"flex", flexDirection:"column" }}>
      <BG/>
      <div style={{ position:"relative", zIndex:1, maxWidth:760, width:"100%",
        margin:"0 auto", flex:1, display:"flex", flexDirection:"column", gap:8 }}>

        {/* ── Header bar (Logo on left) ── */}
        <div style={{ display:"flex", justifyContent:"flex-start", alignItems:"center" }}>
        </div>

        {/* Session info moved to top right */}
        <div style={{ position:"absolute", top:20, right:20, display:"flex", alignItems:"center", gap:8, zIndex:5 }}>
          {/* Green dot + "Session Started" label */}
          <div style={{ fontSize:12, color:"#08673f" }}>● Session Started</div>
          
          {/* Live session timer */}
          <div style={{ fontSize:12, color:COLORS.muted, background:"rgb(0, 0, 0)",
            padding:"4px 10px", borderRadius:20, border:`1px solid ${COLORS.cardBorder}` }}>
            {fmt(sessionTime)}
          </div>
          
          {/* User avatar with pulsing teal ring */}
          <div style={{ width:32, height:32, borderRadius:"50%", background:"#cbb3f4",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:16,
            animation:"pulseRing 2s infinite" }}>👧</div>
        </div>

        {/* ── CAMERA FEED AREA ── */}
        <Card style={{ position:"relative", overflow:"hidden", flex:1, padding:0, marginBottom:0 }}>

          {/* "Face Detected" badge */}
          <div style={{ position:"absolute", top:12, left:12, zIndex:5,
            background:"rgba(0,0,0,0.6)", borderRadius:20, padding:"4px 12px",
            fontSize:12, color:"#ffffff", border:`1px solid #753ada`,
            backdropFilter:"blur(8px)" }}>
            ● Face Detected
          </div>

          {/* Frame counter */}
          <div style={{ position:"absolute", top:12, left:"50%", transform:"translateX(-50%)", zIndex:5,
            background:"rgba(0,0,0,0.5)", borderRadius:20, padding:"4px 12px",
            fontSize:12, color:COLORS.muted, backdropFilter:"blur(8px)" }}>
            Frame {frameCount}
          </div>

          {/* Camera preview with REAL VIDEO STREAM */}
          <div style={{ width:"100%", height:"100%", position:"relative",
            background:"linear-gradient(135deg,#0a0a1a,#0d1230)" }}>
            
            {/* REAL WEBCAM VIDEO */}
            {stream && (
              <video ref={videoRef} style={{
                width:"100%", height:"100%", objectFit:"cover", transform:"scaleX(-1)"
              }} autoPlay playsInline />
            )}

            <div style={{ position:"absolute", inset:0 }}>

              {/* Face bounding box — MOVES WITH FACE */}
              {faceBounds && (
                <div style={{ position:"absolute",
                  left:`${faceBounds.left}%`, top:`${faceBounds.top}%`,
                  width:`${faceBounds.width}%`, height:`${faceBounds.height}%`,
                  border:`2px solid ${cur.borderColor}`,
                  borderRadius:"15%",
                  opacity:0.8, transition:"all 0.1s" }}/>
              )}

              {/* Normal view: REAL facial landmark dots */}
              {viewMode === "normal" && landmarks.length > 0 && (
                <div style={{ position:"absolute", inset:0 }}>
                  {/* Draw selected landmark points */}
                  {[
                    // Eyes
                    33, 133, 159, 145, // Left eye
                    263, 362, 386, 374, // Right eye
                    // Nose
                    0, 6, 168,
                    // Mouth
                    13, 14, 78, 308,
                    // Face outline key points
                    10, 338, 152
                  ].map((idx) => {
                    if (!landmarks[idx]) return null;
                    const lm = landmarks[idx];
                    return (
                      <div key={idx} style={{
                        position:"absolute",
                        left:`${lm.x * 100}%`,
                        top:`${lm.y * 100}%`,
                        width:6, height:6, borderRadius:"50%",
                        background:"#00d9ff", opacity:0.9,
                        transform:"translate(-50%, -50%)",
                        transition:"all 0.05s"
                      }}/>
                    );
                  })}
                </div>
              )}

              {/* Grad-CAM heatmap view */}
              {viewMode === "gradcam" && (() => {
                // Use faceBounds if available, else fall back to centred defaults
                const fx = faceBounds ? faceBounds.left        : 20;
                const fy = faceBounds ? faceBounds.top         : 5;
                const fw = faceBounds ? faceBounds.width       : 60;
                const fh = faceBounds ? faceBounds.height      : 80;
                const isDrowsy = status === "DROWSY";
                const isLow    = status === "LOW_VIGILANT";
                return (
                  <div style={{ position:"absolute", inset:0, animation:"heatPulse 2s ease-in-out infinite"}}>

                    {/* Cool blue base over whole face */}
                    <div style={{
                      position:"absolute",
                      top:`${fy + fh*0.1}%`, left:`${fx}%`,
                    
                      width:`${fw}%`, height:`${fh}%`,
                      borderRadius:"40% 40% 35% 35%",
                      background:"radial-gradient(ellipse, rgba(0,80,255,0.45), rgba(0,30,180,0.2), transparent)",
                      filter:"blur(14px)"
                    }}/>

                    {/* Green/yellow mid zone — forehead + cheeks */}
                    <div style={{
                      position:"absolute",
                      top:`${fy + fh*0.25}%`, left:`${fx + fw*0.05}%`,
                      width:`${fw*0.9}%`, height:`${fh*0.6}%`,
                      borderRadius:"50%",
                      background: isDrowsy
                        ? "radial-gradient(ellipse, rgba(255,180,0,0.75), rgba(0,200,100,0.3), transparent)"
                        : isLow
                        ? "radial-gradient(ellipse, rgba(200,255,0,0.6), rgba(0,180,100,0.25), transparent)"
                        : "radial-gradient(ellipse, rgba(100,255,100,0.5), rgba(0,150,255,0.2), transparent)",
                      filter:"blur(12px)"
                    }}/>

                    {/* Red/orange hot zone — eyes & nose (highest attention area) */}
                    <div style={{
                      position:"absolute",
                      top:`${fy + fh*0.2}%`, left:`${fx + fw*0.1}%`,
                      width:`${fw*0.7}%`, height:`${fh*0.38}%`,
                      borderRadius:"50%",
                      background: isDrowsy
                        ? "radial-gradient(ellipse, rgba(255,20,0,0.95), rgba(255,80,0,0.6), transparent)"
                        : isLow
                        ? "radial-gradient(ellipse, rgba(255,80,0,0.85), rgba(255,160,0,0.5), transparent)"
                        : "radial-gradient(ellipse, rgba(255,200,0,0.8), rgba(255,100,0,0.4), transparent)",
                      filter:"blur(9px)"
                    }}/>

                    {/* Legend — bottom right, clear of all badges */}
                    <div style={{
                      position:"absolute", bottom:10, right:10,
                      background:"rgba(0,0,0,0.78)",
                      borderRadius:8, padding:"6px 10px"
                    }}>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:11, fontWeight:700,
                        marginBottom:4, color:"#fff", letterSpacing:"0.05em" }}>GRAD-CAM HEATMAP</div>
                      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <span style={{ fontSize:9, color:"#ffffff" }}>Low Attention</span>
                        <div style={{ width:56, height:6, borderRadius:3,
                          background:"linear-gradient(90deg,#0000ff,#00ffff,#00ff00,#ffff00,#ff0000)" }}/>
                        <span style={{ fontSize:9, color:"#ffffff" }}>High Attention</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Status label */}
              <div style={{ position:"absolute", bottom:"20%", left:"50%", transform:"translateX(-50%)",
                background:cur.color,
                color: status==="ALERT" ? "#0a0a2e" : COLORS.white,
                padding:"6px 20px", borderRadius:20,
                fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, letterSpacing:"0.05em",
                boxShadow:`0 0 20px ${cur.color}66`,
                transition:"all 0.4s",
                animation: status==="DROWSY" ? "shake 0.5s ease" : "none"
              }}>
                {cur.label}
              </div>

              {/* ACTION REQUIRED overlay */}
              {showAlert && (
                <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.75)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  backdropFilter:"blur(4px)", zIndex:10 }}>
                  <div style={{ textAlign:"center", animation:"fadeUp 0.3s ease" }}>
                    <div style={{ fontSize:48, marginBottom:8, animation:"shake 0.5s ease infinite" }}>⚠️</div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800,
                      color:"#ff4d6d", marginBottom:4, letterSpacing:"0.05em" }}>
                      ACTION REQUIRED
                    </div>
                    <div style={{ color:COLORS.offwhite, fontSize:14 }}>Pull over and rest!</div>
                    <button onClick={()=>setShowAlert(false)} style={{
                      marginTop:16, padding:"8px 20px", borderRadius:8,
                      background:"rgba(255,255,255,0.1)", color:COLORS.white,
                      border:`1px solid ${COLORS.cardBorder}`, cursor:"pointer", fontSize:13
                    }}>Dismiss</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ── Controls + Stats Panel ── */}
        <Card style={{ padding:12, flexShrink:0 }}>

          {/* View mode toggle */}
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
            <span style={{ fontSize:13, color:COLORS.muted }}>View Mode:</span>
            <div style={{ display:"flex", background:"rgba(255,255,255,0.06)", borderRadius:8,
              padding:3, border:`1px solid ${COLORS.cardBorder}` }}>
              {["normal","gradcam"].map(m=>(
                <button key={m} onClick={()=>setViewMode(m)} style={{
                  padding:"5px 14px", borderRadius:6, fontSize:12,
                  fontFamily:"'DM Sans',sans-serif",
                  background: viewMode===m ? "#102161" : "transparent",
                  color:      viewMode===m ? "#ffffff"  : COLORS.muted,
                  fontWeight: viewMode===m ? 400 : 400,
                  transition:"all 0.2s", cursor:"pointer"
                }}>
                  {m==="normal" ? "Normal" : "Grad-CAM heatmap"}
                </button>
              ))}
            </div>
          </div>

          {/* Current status text */}
          <div style={{ textAlign:"center", marginBottom:12 }}>
            <span style={{ fontSize:14, color:COLORS.muted }}>Status: </span>
            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:600,
              color:cur.color, fontSize:16, transition:"color 0.4s" }}>
              {status.replace("_", " ")} {status==="DROWSY" ? "⚠️" : status==="ALERT" ? "✅" : "⚡"}
            </span>
          </div>

          {/* Stats grid — NOW SHOWS REAL-TIME VALUES FROM MEDIAPIPE */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
            {[
              { label:"Left Eye",  value:`L: ${leftEAR}`   },
              { label:"Right Eye", value:`R: ${rightEAR}` },
              { label:"Head Pose", value:`P: ${pitch} Y: ${yaw}` },
              { label:"Mouth",     value:`MAR: ${mar}`     },
            ].map(({ label, value })=>(
              <div key={label} style={{ background:"rgba(255,255,255,0.04)",
                border:`1px solid ${COLORS.cardBorder}`, borderRadius:10, padding:"10px 14px" }}>
                <span style={{ fontSize:13, color:COLORS.muted }}>{label}: </span>
                <span style={{ fontSize:12, fontWeight:400 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* STATUS INDICATORS (not clickable, just showing current state) */}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, color:COLORS.muted, marginBottom:6, textAlign:"center" }}>
              Current driver state (auto-detected via MediaPipe)
            </div>
            <div style={{ display:"flex", gap:6 }}>
              {["ALERT","LOW_VIGILANT","DROWSY"].map(s=>(
                <div key={s} style={{
                  flex:1, padding:"7px 4px", borderRadius:8, fontSize:11,
                  background: status===s ? stats[s].color : "rgba(255,255,255,0.05)",
                  color:      status===s ? (s==="ALERT" ? "#0a0a2e" : COLORS.white) : COLORS.muted,
                  border:`1px solid ${status===s ? stats[s].color : COLORS.cardBorder}`,
                  fontFamily:"'DM Sans',sans-serif", fontWeight:600, transition:"all 0.2s",
                  textAlign:"center"
                }}>
                  {s.replace("_"," ")}
                </div>
              ))}
            </div>
          </div>

          {/* End Session button */}
          <Btn onClick={()=>onNav("session-end")} variant="danger">☒ End Session</Btn>
        </Card>
      </div>
    </div>
  );
};


// -------------------------------------------------- SCREEN 9 — SESSION END + EMAIL REPORT -------------------------------------------
// Shows a summary of the driving session:
//   - Total duration
//   - Number of drowsy events
//   - Worst EAR reading recorded
//   - Number of yawn events
//   - Timestamps of each drowsy alert
//
// The "Email session report" button simulates sending the report.
// In production: collect these stats throughout the monitoring session,
// then call the Python backend (via API) to email them using smtplib.

const SessionEndScreen = ({ onNav }) => {
  const [sent,    setSent]    = useState(false);  // true after email has been sent
  const [sending, setSending] = useState(false);  // true while the send is in progress

  // Simulate sending the email (1.8 second delay)
  // In production: POST to your Python backend which calls smtplib
  const handleSend = () => {
    setSending(true);
    setTimeout(()=>{ setSending(false); setSent(true); }, 1800);
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", position:"relative", padding:24 }}>
      <BG/>
      <div style={{ position:"relative", zIndex:1, maxWidth:480, width:"100%" }}>
        <div style={{ marginBottom:-120 }}><Logo size={300}/></div>

        <Card style={{ padding:28, marginBottom: 24 }}>
          {/* Header */}
          <div style={{ textAlign:"center", marginBottom:24 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🏁</div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:700, marginBottom:6 }}>
              Session Complete
            </h2>
            <p style={{ color:COLORS.muted, fontSize:14 }}>Here's your fatigue summary</p>
          </div>

          {/* 2×2 summary stats grid
              In production: replace hardcoded values with real session data */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
            {[
              { icon:"⏱️", label:"Duration",      value:"00:07:42" },
              { icon:"⚠️", label:"Drowsy Events", value:"3"        },
              { icon:"😴", label:"Worst EAR",     value:"0.11"     },
              { icon:"🥱", label:"Yawn Events",   value:"2"        },
            ].map(({ icon, label, value })=>(
              <div key={label} style={{ background:"rgba(255,255,255,0.04)",
                border:`1px solid ${COLORS.cardBorder}`, borderRadius:12, padding:14, textAlign:"center" }}>
                <div style={{ fontSize:22, marginBottom:4 }}>{icon}</div>
                <div style={{ fontSize:12, color:COLORS.muted, marginBottom:2 }}>{label}</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:18 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Drowsy alert timestamp log
              In production: store these in a list during the session and render them here */}
          <div style={{ background:"rgba(255,59,48,0.08)", border:`1px solid rgba(255,59,48,0.2)`,
            borderRadius:10, padding:14, marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:600, color:COLORS.danger, marginBottom:8 }}>
              ⚠️ Drowsy Alert Timestamps
            </div>
            {[
              "00:02:15 — Prolonged eye closure",
              "00:04:58 — Head nod detected",
              "00:06:33 — Low EAR sustained 2s",
            ].map(t=>(
              <div key={t} style={{ fontSize:12, color:COLORS.muted, padding:"3px 0",
                borderBottom:`1px solid rgba(255,255,255,0.04)` }}>
                {t}
              </div>
            ))}
          </div>

          {/* Email button — shows loading state, then a success confirmation */}
          {!sent ? (
            <Btn onClick={handleSend} disabled={sending}>
              {sending ? "Sending report..." : "📧 Email session report"}
            </Btn>
          ) : (
            <div style={{ textAlign:"center", padding:"14px",
              background:"rgba(0,200,81,0.1)", border:`1px solid ${COLORS.alert}`, borderRadius:10 }}>
              <span style={{ color:COLORS.alert, fontWeight:600 }}> Report sent to your email!</span>
            </div>
          )}
        </Card>

        {/* Go back to home screen */}
        <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
          <Btn onClick={()=>onNav("home")} variant="back" style={{ width:"auto", padding:"12px 24px" }}>← Back to Home</Btn>
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------ APP ROUTER ------------------------------------------
// This is the root component that controls which screen is currently visible.
// 'screen' is a string like "home", "monitoring", etc.
// 'setScreen' is passed to every screen as 'onNav', when a screen calls.
// onNav("monitoring"), it updates 'screen' here and React re-renders to show the correct screen.

// The key={screen} on the wrapper div forces React to remount the screen component when the screen changes, which triggers the fade-up animation.
export default function App() {
  const [screen, setScreen] = useState("home"); // start on the home screen
  const [cameraStream, setCameraStream] = useState(null);
  

  // Map of screen names to their components.
  // Each component receives setScreen as 'onNav' so it can navigate.
  const screens = {
    "home":               <HomeScreen              onNav={setScreen}/>,
    "oauth":              <OAuthScreen             onNav={setScreen}/>,
    "login-form":         <LoginScreen             onNav={setScreen}/>,
  
    "instructions":       <InstructionsScreen      onNav={setScreen}/>,
    "camera-permissions": <CameraPermissionsScreen onNav={setScreen} onStreamReady={setCameraStream} />,
    "monitoring":         <MonitoringScreen        onNav={setScreen} stream={cameraStream} />,
    "session-end":        <SessionEndScreen        onNav={setScreen}/>,
  };

  return (
    <>
      {/* Inject fonts and global CSS into the page */}
      <style>{fonts}{globalStyle}</style>

      {/* key={screen} causes React to remount on screen change → triggers fade-up animation */}
      <div key={screen} style={{ animation:"fadeUp 0.35s ease" }}>
        {/* Show the current screen, or fall back to home if the key doesn't exist */}
        {screens[screen] || screens["home"]}
      </div>
    </>
  );
}

