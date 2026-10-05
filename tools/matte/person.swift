// Person matte per frame with Apple's Vision framework (macOS 12+; no model download).
//   swiftc -O person.swift -o /tmp/lemo-person && /tmp/lemo-person <frames dir> <out dir> [accurate|balanced]
//   options (after the two paths): accurate|balanced  --scale 0.5  --instances
// Reads *.jpg|png, writes a same-named RGBA PNG: white, alpha = person (255 = person), at scale x the frame's size (0.5 keeps 721 frames light
// for a page to hold). Default is Vision's person segmentation; --instances uses the foreground-instance mask (macOS 14+), which also keeps
// things the person holds or leans on, but can pull in a nearby object (a board the host stands against).
import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count >= 3 else { print("usage: person <frames dir> <out dir> [accurate|balanced]"); exit(2) }
let inDir = URL(fileURLWithPath: args[1]), outDir = URL(fileURLWithPath: args[2])
let quality: VNGeneratePersonSegmentationRequest.QualityLevel = args.contains("balanced") ? .balanced : .accurate
let useInstances = args.contains("--instances")
var scale: CGFloat = 1
if let i = args.firstIndex(of: "--scale"), i + 1 < args.count, let v = Double(args[i + 1]) { scale = CGFloat(v) }
try FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
let files = try FileManager.default.contentsOfDirectory(at: inDir, includingPropertiesForKeys: nil).filter { ["jpg", "jpeg", "png"].contains($0.pathExtension.lowercased()) }.sorted { $0.lastPathComponent < $1.lastPathComponent }
let ctx = CIContext()
var done = 0
for f in files {
    autoreleasepool {
        guard let src = CGImageSourceCreateWithURL(f as CFURL, nil), let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { return }
        let w = img.width, h = img.height
        let handler = VNImageRequestHandler(cgImage: img, options: [:])
        var buf: CVPixelBuffer? = nil
        if useInstances, #available(macOS 14.0, *) {
            let r = VNGenerateForegroundInstanceMaskRequest()
            if (try? handler.perform([r])) != nil, let o = r.results?.first, !o.allInstances.isEmpty {
                buf = try? o.generateScaledMaskForImage(forInstances: o.allInstances, from: handler)
            }
        }
        if buf == nil {
            let r = VNGeneratePersonSegmentationRequest(); r.qualityLevel = quality; r.outputPixelFormat = kCVPixelFormatType_OneComponent8
            if (try? handler.perform([r])) != nil { buf = r.results?.first?.pixelBuffer }
        }
        guard let pb = buf else { FileHandle.standardError.write("no mask: \(f.lastPathComponent)\n".data(using: .utf8)!); return }
        let ow = max(1, Int(CGFloat(w) * scale)), oh = max(1, Int(CGFloat(h) * scale))
        var ci = CIImage(cvPixelBuffer: pb)
        ci = ci.transformed(by: CGAffineTransform(scaleX: CGFloat(ow) / ci.extent.width, y: CGFloat(oh) / ci.extent.height))
        guard let gray = ctx.createCGImage(ci, from: CGRect(x: 0, y: 0, width: ow, height: oh), format: .L8, colorSpace: CGColorSpaceCreateDeviceGray()),
              let data = gray.dataProvider?.data, let p = CFDataGetBytePtr(data) else { return }
        var rgba = [UInt8](repeating: 0, count: ow * oh * 4)
        for y in 0..<oh { for x in 0..<ow { let v = p[y * gray.bytesPerRow + x]; let o = (y * ow + x) * 4; rgba[o] = v; rgba[o + 1] = v; rgba[o + 2] = v; rgba[o + 3] = v } }   // white, premultiplied
        guard let prov = CGDataProvider(data: Data(rgba) as CFData),
              let cg = CGImage(width: ow, height: oh, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: ow * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue), provider: prov, decode: nil, shouldInterpolate: true, intent: .defaultIntent) else { return }
        let out = outDir.appendingPathComponent(f.deletingPathExtension().lastPathComponent + ".png")
        if let d = CGImageDestinationCreateWithURL(out as CFURL, UTType.png.identifier as CFString, 1, nil) { CGImageDestinationAddImage(d, cg, nil); CGImageDestinationFinalize(d) }
        done += 1
    }
}
print("matted \(done)/\(files.count)")
