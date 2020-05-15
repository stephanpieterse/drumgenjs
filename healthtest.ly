\version "2.18.2"
#(ly:set-option 'resolution '400)
#(ly:set-option 'pixmap-format 'pngalpha)
#(ly:set-option 'backend 'eps)
#(ly:set-option 'no-gs-load-fonts '#t)
#(ly:set-option 'include-eps-fonts '#t)
\paper {
 indent = 0\mm
 line-width = 110\mm
 oddHeaderMarkup = ""
 evenHeaderMarkup = ""
 oddFooterMarkup = ""
 evenFooterMarkup = ""
}#(define mydrums '( (hihat  cross   #f  0) ))
% gendate:7258118400
% filename:/opt/app/tmpgen/5b5b22626f68225d2c6e756c6c2c747275655ds3P5c6p5cnc6cb5lps4cmP6cmc3P5c6el-nometro-136
\score {
<<
<<
\new DrumStaff
\with { drumStyleTable = #percussion-style \override StaffSymbol.line-count = #1 instrumentName = #"" }
 {
\omit Score.MetronomeMark
\time 4/4
\set DrumStaff.drumStyleTable = #(alist->hash-table mydrums)
\tempo 4 = 136
\drummode {
\repeat volta 2 {boh4-"R"-\omit\pp {
boh8-"L"-\omit\pp boh8->-"L"-\omit\fff }
boh4-"L"-\omit\pp {
r16 boh16->-"L"-\omit\fff r16 boh16-"L"-\omit\pp }
 }}
}
\new DrumStaff
\with { drumStyleTable = #percussion-style \override StaffSymbol.line-count = #1 instrumentName = #"" }
 {
\omit Score.MetronomeMark
\time 4/4
\set DrumStaff.drumStyleTable = #(alist->hash-table mydrums)
\tempo 4 = 136
\drummode {
\repeat volta 2 {{
boh8->-"R"-\omit\fff r8 }
{
boh8->-"L"-\omit\fff r8 }
boh4-"R"-\omit\pp {
boh8-"L"-\omit\pp boh8->-"L"-\omit\fff }
 }}
}
>>
>>
\layout { }
}
\score {
\unfoldRepeats
<<
<<
\new DrumStaff
\with { drumStyleTable = #percussion-style \override StaffSymbol.line-count = #1 instrumentName = #"" }
 {
\omit Score.MetronomeMark
\time 4/4
\set DrumStaff.drumStyleTable = #(alist->hash-table mydrums)
\tempo 4 = 136
\drummode {
\repeat volta 2 {boh4-"R"-\omit\pp {
boh8-"L"-\omit\pp boh8->-"L"-\omit\fff }
boh4-"L"-\omit\pp {
r16 boh16->-"L"-\omit\fff r16 boh16-"L"-\omit\pp }
 }}
}
\new DrumStaff
\with { drumStyleTable = #percussion-style \override StaffSymbol.line-count = #1 instrumentName = #"" }
 {
\omit Score.MetronomeMark
\time 4/4
\set DrumStaff.drumStyleTable = #(alist->hash-table mydrums)
\tempo 4 = 136
\drummode {
\repeat volta 2 {{
boh8->-"R"-\omit\fff r8 }
{
boh8->-"L"-\omit\fff r8 }
boh4-"R"-\omit\pp {
boh8-"L"-\omit\pp boh8->-"L"-\omit\fff }
 }}
}
>>
>>
\midi { }
}
