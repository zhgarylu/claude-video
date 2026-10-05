// On-screen text per image with Apple's Vision framework (macOS 12+; no model download).
//   swiftc -O ocr.swift -o /tmp/lemo-ocr && /tmp/lemo-ocr img1.jpg img2.jpg … > out.json
// Prints {"file": [{"text", "x", "y", "w", "h", "conf"}]} (boxes normalised, origin top-left). Languages: Simplified Chinese and English.
import Foundation
import Vision
import ImageIO

var out: [String: [[String: Any]]] = [:]
for path in CommandLine.arguments.dropFirst() {
    guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil), let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { continue }
    let req = VNRecognizeTextRequest(); req.recognitionLevel = .accurate; req.recognitionLanguages = ["zh-Hans", "en-US"]; req.usesLanguageCorrection = true
    try? VNImageRequestHandler(cgImage: img, options: [:]).perform([req])
    var items: [[String: Any]] = []
    for o in req.results ?? [] {
        guard let c = o.topCandidates(1).first, c.confidence >= 0.4 else { continue }
        let b = o.boundingBox
        items.append(["text": c.string, "x": b.minX, "y": 1 - b.maxY, "w": b.width, "h": b.height, "conf": c.confidence])
    }
    out[URL(fileURLWithPath: path).lastPathComponent] = items
}
if let d = try? JSONSerialization.data(withJSONObject: out, options: [.prettyPrinted]), let s = String(data: d, encoding: .utf8) { print(s) }
