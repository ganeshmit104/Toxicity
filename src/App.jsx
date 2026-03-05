import { useState, useRef, useCallback } from "react";

const RiskBadge = ({ level }) => {
  const config = {
    LOW: { bg: "#0d2e1a", border: "#1a6b3a", text: "#4dff8f", label: "LOW RISK" },
    MODERATE: { bg: "#2e2400", border: "#8b6d00", text: "#ffd700", label: "MODERATE" },
    HIGH: { bg: "#2e0f00", border: "#cc4400", text: "#ff6b35", label: "HIGH RISK" },
    CRITICAL: { bg: "#2e0008", border: "#cc0020", text: "#ff0033", label: "CRITICAL" },
  };
  const c = config[level] || config.LOW;
  return (
    <span style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, padding: "3px 10px", borderRadius: "3px", fontSize: "11px", fontFamily: "monospace", fontWeight: "700", letterSpacing: "1px" }}>
      ⬡ {c.label}
    </span>
  );
};

export default function ToxicityScanner() {
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageType, setImageType] = useState("image/jpeg");
  const [textInput, setTextInput] = useState("");
  const [mode, setMode] = useState("text");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const processFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImageType(file.type);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target.result);
      setImageBase64(e.target.result.split(",")[1]);
      setResult(null); setError(null);
    };
    reader.readAsDataURL(file);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    processFile(e.dataTransfer.files[0]);
  }, []);

  const analyze = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      let messages;
      if (mode === "image" && imageBase64) {
        messages = [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: imageType, data: imageBase64 } },
          { type: "text", text: "Analyze this product for toxic substances. Respond with raw JSON only." }
        ]}];
      } else {
        messages = [{ role: "user", content: `Analyze these ingredients for toxic substances. Respond with raw JSON only.\n\n${textInput}` }];
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, mode })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      setResult(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const reset = () => { setImage(null); setImageBase64(null); setTextInput(""); setResult(null); setError(null); };
  const riskColor = result ? ({ LOW: "#4dff8f", MODERATE: "#ffd700", HIGH: "#ff6b35", CRITICAL: "#ff0033" }[result.overallRisk] || "#4dff8f") : "#4dff8f";

  return (
    <div style={{ minHeight: "100vh", background: "#060a0e", fontFamily: "monospace", color: "#c8d8e8" }}>
      <style>{`
        * { box-sizing: border-box; }
        button { transition: all 0.15s; cursor: pointer; }
        .scan-btn:hover:not(:disabled) { background: #1a4a2e !important; }
        .scan-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .drop-zone:hover { border-color: #2a6b44 !important; background: #0a1a12 !important; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .result-card { animation: fadeIn 0.3s ease; }
        .toxic-row { border-left: 3px solid; padding: 12px 14px; margin-bottom: 8px; background: #080e0b; border-radius: 0 4px 4px 0; }
      `}</style>

      <div style={{ borderBottom: "1px solid #0f2318", padding: "16px 28px", display: "flex", alignItems: "center", gap: "12px", background: "#040709" }}>
        <div style={{ width: "30px", height: "30px", border: "2px solid #1a6b3a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>☣</div>
        <div>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#4dff8f", letterSpacing: "3px" }}>TOXSCAN</div>
          <div style={{ fontSize: "9px", color: "#3a6b50", letterSpacing: "2px" }}>AI PRODUCT SAFETY ANALYZER</div>
        </div>
      </div>

      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "28px 24px" }}>
        {!result ? (
          <>
            <div style={{ display: "flex", marginBottom: "20px", border: "1px solid #0f2318", borderRadius: "4px", overflow: "hidden", width: "fit-content" }}>
              {[{id:"text",label:"✏ TEXT INPUT"},{id:"image",label:"📷 IMAGE SCAN"}].map(m => (
                <button key={m.id} onClick={() => { setMode(m.id); setError(null); }} style={{
                  background: mode === m.id ? "#0d2e1a" : "transparent", border: "none",
                  color: mode === m.id ? "#4dff8f" : "#2a5a3a", padding: "8px 18px",
                  fontSize: "10px", letterSpacing: "2px", fontFamily: "monospace", fontWeight: "700"
                }}>{m.label}</button>
              ))}
            </div>

            <h1 style={{ fontSize: "clamp(22px,4vw,38px)", fontWeight: "800", color: "#e8f4ee", margin: "0 0 8px", lineHeight: "1.1" }}>
              Detect Hidden<br /><span style={{ color: "#4dff8f" }}>Toxic Substances</span>
            </h1>
            <p style={{ fontSize: "11px", color: "#3a6b50", letterSpacing: "1px", marginBottom: "20px" }}>
              Upload a product photo or paste ingredients — AI analyzes for carcinogens, endocrine disruptors & more
            </p>

            {mode === "image" ? (
              <div className="drop-zone" onClick={() => fileRef.current.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)} onDrop={onDrop}
                style={{ border: `2px dashed ${dragging ? "#4dff8f" : image ? "#1a6b3a" : "#0f2318"}`, borderRadius: "6px", padding: "28px", textAlign: "center", background: "#040709", minHeight: "180px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => processFile(e.target.files[0])} />
                {image ? (
                  <><img src={image} alt="product" style={{ maxHeight: "180px", maxWidth: "100%", borderRadius: "4px", objectFit: "contain" }} /><div style={{ fontSize: "10px", color: "#4dff8f" }}>✓ IMAGE LOADED — CLICK TO CHANGE</div></>
                ) : (
                  <><div style={{ fontSize: "32px", opacity: 0.3 }}>⬡</div><div style={{ fontSize: "11px", color: "#2a5a3a" }}>DROP PRODUCT IMAGE HERE</div><div style={{ fontSize: "10px", color: "#1a3a28" }}>or click to browse</div></>
                )}
              </div>
            ) : (
              <textarea value={textInput} onChange={e => setTextInput(e.target.value)}
                placeholder={"Paste ingredients list here...\n\nExample: Water, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Fragrance, Methylisothiazolinone, Parabens..."}
                style={{ width: "100%", minHeight: "180px", background: "#040709", border: "1px solid #0f2318", borderRadius: "6px", color: "#c8d8e8", padding: "14px", fontSize: "12px", fontFamily: "monospace", resize: "vertical", outline: "none", lineHeight: "1.7" }} />
            )}

            {error && (
              <div style={{ marginTop: "10px", padding: "10px 14px", background: "#1a0508", border: "1px solid #4a1520", borderRadius: "4px", fontSize: "11px", color: "#ff8888" }}>
                ⚠ {error}
              </div>
            )}

            <button className="scan-btn" onClick={analyze}
              disabled={loading || (mode === "image" ? !imageBase64 : !textInput.trim())}
              style={{ marginTop: "16px", width: "100%", padding: "13px", background: "#0d2e1a", border: "1px solid #1a6b3a", color: "#4dff8f", fontSize: "12px", fontFamily: "monospace", fontWeight: "700", letterSpacing: "3px", borderRadius: "4px" }}>
              {loading
                ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>◈</span> ANALYZING...</span>
                : "⬡ RUN TOXICITY SCAN"}
            </button>

            <div style={{ marginTop: "28px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
              {[{ icon: "🧬", label: "CARCINOGENS" }, { icon: "⚗", label: "ENDOCRINE DISRUPTORS" }, { icon: "⚡", label: "NEUROTOXINS" }].map(f => (
                <div key={f.label} style={{ padding: "12px", border: "1px solid #0f2318", borderRadius: "4px", background: "#040709", textAlign: "center" }}>
                  <div style={{ fontSize: "20px", marginBottom: "6px" }}>{f.icon}</div>
                  <div style={{ fontSize: "9px", color: "#4dff8f", letterSpacing: "1px", fontWeight: "700" }}>{f.label}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="result-card">
            <button onClick={reset} style={{ background: "none", border: "1px solid #0f2318", color: "#3a6b50", padding: "6px 14px", fontSize: "10px", fontFamily: "monospace", letterSpacing: "2px", borderRadius: "3px", marginBottom: "18px" }}>← NEW SCAN</button>

            <div style={{ background: "#040a07", border: `1px solid ${riskColor}22`, borderRadius: "6px", padding: "22px", marginBottom: "14px", borderLeft: `4px solid ${riskColor}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <div style={{ fontSize: "10px", color: "#3a6b50", letterSpacing: "2px", marginBottom: "5px" }}>PRODUCT IDENTIFIED</div>
                  <div style={{ fontSize: "20px", fontWeight: "700", color: "#e8f4ee", marginBottom: "3px" }}>{result.productName}</div>
                  <div style={{ fontSize: "11px", color: "#3a6b50" }}>{result.category}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <RiskBadge level={result.overallRisk} />
                  <div style={{ marginTop: "8px" }}>
                    <div style={{ fontSize: "9px", color: "#2a5a3a", marginBottom: "3px" }}>RISK SCORE</div>
                    <div style={{ fontSize: "34px", fontWeight: "800", color: riskColor, lineHeight: 1 }}>{result.riskScore}</div>
                    <div style={{ fontSize: "9px", color: "#2a5a3a" }}>/100</div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: "14px", height: "3px", background: "#0a1a12", borderRadius: "2px" }}>
                <div style={{ height: "100%", width: `${result.riskScore}%`, background: `linear-gradient(90deg, #4dff8f, ${riskColor})`, borderRadius: "2px" }} />
              </div>
              <p style={{ marginTop: "14px", fontSize: "12px", color: "#8aab9a", lineHeight: "1.7", marginBottom: 0 }}>{result.summary}</p>
            </div>

            {result.toxicSubstances?.length > 0 && (
              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "10px", color: "#4dff8f", letterSpacing: "2px", marginBottom: "10px", fontWeight: "700" }}>◈ DETECTED SUBSTANCES ({result.toxicSubstances.length})</div>
                {result.toxicSubstances.map((sub, i) => {
                  const sc = { LOW: "#4dff8f", MODERATE: "#ffd700", HIGH: "#ff6b35", CRITICAL: "#ff0033" }[sub.severity] || "#4dff8f";
                  return (
                    <div key={i} className="toxic-row" style={{ borderColor: sc }}>
                      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "5px" }}>
                        <span style={{ color: "#e8f4ee", fontSize: "12px", fontWeight: "700" }}><span style={{ color: sc }}>◈ </span>{sub.name}</span>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <span style={{ fontSize: "9px", color: "#3a6b50", background: "#040709", padding: "2px 8px", borderRadius: "2px", border: "1px solid #0f2318" }}>{sub.type}</span>
                          <RiskBadge level={sub.severity} />
                        </div>
                      </div>
                      <div style={{ fontSize: "11px", color: "#6a9a7a", lineHeight: "1.6" }}>{sub.description}</div>
                      {sub.foundIn && <div style={{ fontSize: "10px", color: "#2a5a3a", marginTop: "3px" }}>Found in: {sub.foundIn}</div>}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
              {result.safeIngredients?.length > 0 && (
                <div style={{ background: "#040a07", border: "1px solid #0f2318", borderRadius: "4px", padding: "14px" }}>
                  <div style={{ fontSize: "10px", color: "#4dff8f", letterSpacing: "2px", marginBottom: "8px", fontWeight: "700" }}>✓ SAFE INGREDIENTS</div>
                  {result.safeIngredients.map((s, i) => <div key={i} style={{ fontSize: "11px", color: "#4a8a6a", padding: "3px 0", borderBottom: "1px solid #0a1510" }}>+ {s}</div>)}
                </div>
              )}
              {result.regulatoryFlags?.length > 0 && (
                <div style={{ background: "#0a0408", border: "1px solid #2a0a12", borderRadius: "4px", padding: "14px" }}>
                  <div style={{ fontSize: "10px", color: "#ff6b35", letterSpacing: "2px", marginBottom: "8px", fontWeight: "700" }}>⚠ REGULATORY FLAGS</div>
                  {result.regulatoryFlags.map((f, i) => <div key={i} style={{ fontSize: "11px", color: "#cc4422", padding: "3px 0", borderBottom: "1px solid #1a0508" }}>⬡ {f}</div>)}
                </div>
              )}
            </div>

            {result.recommendations?.length > 0 && (
              <div style={{ background: "#040a07", border: "1px solid #0f2318", borderRadius: "4px", padding: "14px", marginBottom: "14px" }}>
                <div style={{ fontSize: "10px", color: "#ffd700", letterSpacing: "2px", marginBottom: "8px", fontWeight: "700" }}>▸ RECOMMENDATIONS</div>
                {result.recommendations.map((r, i) => (
                  <div key={i} style={{ fontSize: "11px", color: "#8aab7a", padding: "4px 0", borderBottom: "1px solid #0a1510", display: "flex", gap: "8px" }}>
                    <span style={{ color: "#ffd700", flexShrink: 0 }}>{i + 1}.</span> {r}
                  </div>
                ))}
              </div>
            )}

            {result.disclaimer && (
              <div style={{ fontSize: "10px", color: "#1e4a30", padding: "10px", border: "1px solid #0a1a12", borderRadius: "4px", lineHeight: "1.6" }}>ℹ {result.disclaimer}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
