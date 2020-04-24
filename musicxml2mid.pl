#! /usr/bin/perl
#########################################################################
#        This Perl script is Copyright (c) 2007, Peter J Billam         #
#                c/o DPIW, Hobart, Tasmania, Australia                  #
#                                                                       #
#     This script is free software; you can redistribute it and/or      #
#            modify it under the same terms as Perl itself.             #
#########################################################################
eval 'require MIDI'; if ($@) {
   die "you'll need to install the MIDI::Perl module from www.cpan.org\n";
}
import MIDI;
eval 'require XML::Parser'; if ($@) {
   die "you'll need to install the XML::Parser module from www.cpan.org\n";
}
import XML::Parser;

my $Version       = '1.7';  # add lyric events
my $VersionDate   = '5feb2009';
my $Debug         = 0;

while ($ARGV[$[] =~ /^-([a-z])/) {
   if ($1 eq 'v')      { shift;
		my $n = $0; $n =~ s{^.*/([^/]+)$}{$1};
		print "$n version $Version $VersionDate\n";
		exit 0;
   } elsif ($1 eq 'd') { $Debug = 1; shift;
   } else {
		print "usage:\n";  my $synopsis = 0;
		while (<DATA>) {
			if (/^=head1 SYNOPSIS/)     { $synopsis = 1; next; }
			if ($synopsis && /^=head1/) { last; }
			if ($synopsis && /\S/)      { s/^\s*/   /; print $_; next; }
		}
		exit 0;
	}
}

my %text;
my %attribute;
my $current_element = q{};
my $TPC = 480;
my $local_TPC = 96;
my $miditicksperbeat;
my $ticksatbarstart;
my $ticksthisbar;
my $bar_length;
my %step2pitch;
my %id2channel;
my $part_id;
my $score_part_id;
my $score_instrument_id;
my $midi_instrument_id;
my $instrument_id;
my %part;          # Hash of Lists of score-events
my %tie_type;
my %started_tie;
my $transpose;
my $timewise = 0;
my $bar_number;
my $lyric_text;
my $within_an_element;
my $is_a_rest;
my $is_a_grace;

&initialise();
$p1 = new XML::Parser();
$p1->setHandlers( Start => \&start, Char => \&text, End => \&end, );
	
$p1->parsefile($ARGV[$[] || '-');
&midi_write() unless $Debug;
exit;

sub start { my ($e, $name, %attr) = @_;
	$current_element = $name;
	$within_an_element = 1;
	$text{$name} = q{};
	if ($name eq 'pitch')           { $text{alter} = q{0};
	} elsif ($name eq 'note')       {
		$attribute{attack}   = 0;
		$attribute{release}  = 0;
		$attribute{dynamics} = 90;
		$is_a_rest =0;  $is_a_grace = 0;
		%tie_type = (); $lyric_text = q{};
	} elsif ($name eq 'rest')       { $is_a_rest  = 1;
	} elsif ($name eq 'grace')      { $is_a_grace = 1;
	} elsif ($name eq 'instrument') { $instrument_id = $attr{id};
		if ($Debug) { print "instrument: instrument_id=$instrument_id\n"; }
	} elsif ($name eq 'lyric')      { $lyric_number = $attr{number};
	} elsif ($name eq 'measure')    {
		$ticksthisbar = 0; $bar_length = 0;
		$bar_number = $attr{number};
	} elsif ($name eq 'midi-instrument') {
		delete $text{'midi-channel'}; delete $text{'midi-program'};
		$midi_instrument_id = $attr{id};
	} elsif ($name eq 'part')       {
		$part_id = $attr{id};
		if ($timewise) { $ticksthisbar = 0; $bar_length = 0;
		} else { $transpose = 0; $ticksatbarstart = 0;
		}
	} elsif ($name eq 'score-part') { $score_part_id = $attr{id};
	} elsif ($name eq 'score-instrument') { $score_instrument_id = $attr{id};
	} elsif ($name eq 'score-timewise') { $timewise = 1;
		if ($Debug) { print "timewise\n"; }
	} elsif ($name eq 'sound')      {
		delete $attribute{pan}; delete $attribute{tempo};
	} elsif ($name eq 'tie')        { $tie_type{$attr{type}} = 1;
	}
	while (($k,$v)= each %attr) { $attribute{$k} = $v; }
	return;
}
sub text {
	return unless $within_an_element; return unless $current_element;
	my ($e, $text) = @_;
	# handle multiple calls from a single non-markup sequence of chars!
	$text{$current_element} .= $text;  
}
sub end { my ($e, $name) = @_;
	$within_an_element = 0;
	$text{$current_element} =~ s/^\s+//;
	$text{$current_element} =~ s/\s+$//;
	if ($name eq 'note')  {
		if ($is_a_rest)  { &rest_(@_); } else { &note_(@_); }
	} elsif ($name eq 'midi-instrument')  { &midi_instrument_(@_);
	} elsif ($name eq 'score-instrument') { $score_instrument_id = q{};
	} elsif ($name eq 'measure')    { &measure_(@_);
	} elsif ($name eq 'backup')     { &backup_(@_);
	} elsif ($name eq 'chord')      { &chord_(@_);
	} elsif ($name eq 'divisions')  { &divisions_(@_);
	} elsif ($name eq 'forward')    { &forward_(@_);
	} elsif ($name eq 'sound')      { &sound_(@_);
	} elsif ($name eq 'lyric')      { &lyric_(@_);
	} elsif ($name eq 'time')       { &time_(@_);
	} elsif ($name eq 'transpose')  { $transpose = $text{chromatic};
	} elsif ($name eq 'score-part') { $score_part_id = q{};
	}
	$current_element = '';
}

# --------------------- end-of-element routines --------------------
sub backup_ { my ($e, $name) = @_;
	if ($ticksthisbar > $bar_length) { $bar_length = $ticksthisbar; }
	if ($Debug) { print "backup: ticksthisbar=$ticksthisbar\n"; }
	$ticksthisbar -= int (0.5 + $text{duration}*$TPC/$local_TPC);
	if ($ticksthisbar < 0) {
		warn "Warning: excessive backup in bar $bar_number"
		. " after stave $text{staff} ticksthisbar=$ticksthisbar\n";
		if ($Debug) {
			print "Warning: excessive backup in bar $bar_number"
			. " after stave $text{staff} ticksthisbar=$ticksthisbar\n";
		}
		$ticksthisbar = 0;
	}
	if ($Debug) {
		print "        duration=$text{duration} ticksthisbar=$ticksthisbar\n";
	}
}
sub chord_ { my ($e, $name) = @_;
	$ticksthisbar -= int (0.5 + $text{duration}*$TPC/$local_TPC);
	if ($ticksthisbar < 0) {
		warn "Warning: excessive chord in bar $bar_number\n";
		$ticksthisbar = 0;
	}
	if ($Debug) { print "chord: duration=$text{duration}\n"; }
}
sub divisions_ { my ($e, $name) = @_;
	$local_TPC = $text{divisions};
	if ($Debug) { print "$name: local_TPC=$local_TPC\n"; }
}
sub forward_ { my ($e, $name) = @_;
	$ticksthisbar += int (0.5 + $text{duration}*$TPC/$local_TPC);
	if ($Debug) { print "forward: duration=$text{duration}\n"; }
}
sub lyric_   { my ($e, $name) = @_;
	$lyric_text=$text{'text'};
    # UTF-8 to ISO 8859-1, from "perldoc perluniintro"
    $lyric_text
	 =~ s/([\xC2\xC3])([\x80-\xBF])/chr(ord($1)<<6&0xC0|ord($2)&0x3F)/eg;
	$lyric_text =~ s/\341/ae/g;
	$lyric_text =~ s/\366/oe/g;
	$lyric_text =~ s/\374/ue/g;
	# Why won't these lines protect MIDI::Perl aginst wide characters ?
    # $lyric_text =~ s/([\x80-\xFF])/chr(ord($1)&0x7F)/eg;
    # $lyric_text =~ tr/'"//d;
    $lyric_text =~ s/\W//g;
	my $syllabic=$text{'syllabic'};
	if ($syllabic eq 'end' || $syllabic eq 'single') {
		$lyric_text .= ' ';
	}
	if ($Debug) { print "$name: syllabic=$syllabic text='$lyric_text'\n"; }
}
sub measure_ { my ($e, $name) = @_;
	if ($Debug) {
		print "end of measure $bar_number:"
		. " ticksatbarstart=$ticksatbarstart"
		. " bar_length=$bar_length ticksthisbar=$ticksthisbar\n";
	}
	# measure the maximum bar length of all the voices...
	if ($bar_length > $ticksthisbar) { $ticksatbarstart += $bar_length;
	} else { $ticksatbarstart += $ticksthisbar;
	}
	if ($Debug) {
		print "     starting new measure ticksatbarstart=$ticksatbarstart\n";
	}
}
sub midi_instrument_ { my ($e, $name) = @_;
	if (defined $text{'midi-channel'}) {
		if ($midi_instrument_id) {
			$id2channel{$midi_instrument_id} = $text{'midi-channel'};
		}
		if ($score_part_id) {
			$id2channel{$score_part_id} = $text{'midi-channel'};
		}
		if ($score_instrument_id) {
			$id2channel{$score_instrument_id} = $text{'midi-channel'};
		}
		if ($Debug) {
			print "midi_instrument: id=$id "
			. "midi-channel=$text{'midi-channel'}\n";
		}
	}
	if (defined $text{'midi-program'}) {
		my $id = $midi_instrument_id||$score_part_id||$score_instrument_id;
		if ($Debug) {
			print "midi_instrument: id=$id "
			. "midi-program=$text{'midi-program'}\n";
		}
		my $cha   = $id2channel{$id} - 1;
		my $patch = $text{'midi-program'} - 1;
		my $my_part_id = $part_id || $score_part_id;
		if ($Debug) {
			print "    cha=$cha patch=$patch my_part_id=$my_part_id\n";
		}
		push @{$part{$my_part_id}},
		 ['patch_change', $ticksatbarstart, $cha, $patch];
		$ticksthisbar += 5;
		if (defined $attribute{pan}) {
			my $pan = $attribute{pan}/1.8 + 50.0;
			&control_change($id, $cha,10,$pan);
		}
	}
	$midi_instrument_id = q{};
}
sub note_ { my ($e, $name) = @_;
	my $B = $ticksatbarstart + $ticksthisbar + $attribute{attack};
	my $D = $text{duration} - $attribute{attack} + $attribute{release};
	$D = int (0.5 + $D*$TPC/$local_TPC);
	my $id = $instrument_id || $part_id;
	my $channel = $id2channel{$id} - 1;
  my $realstep = $text{step} || $text{"display-step"};
  my $realoctave = $text{octave} || $text{"display-octave"};
	my $note = 12 + 12*$octave
	+ $step2pitch{$realstep} + $text{alter} + $transpose;
	my $velocity = int (0.5 + 0.9 * $attribute{dynamics});
	if ($velocity > 127)    { $velocity = 127;
	} elsif ($velocity < 0) { $velocity = 0;
	}
	if ($Debug) {
		print "note: step=$text{step} rs=$realstep octave=$text{octave} ro=$realoctave alter="
		. "$text{alter} duration=$text{duration} attack=$attribute{attack}"
		. "\n     B=$B D=$D"
		. " channel=$channel velocity=$velocity"
		. " note=$note id=$id part_id=$part_id\n";
	}
	if ($tie_type{stop} && $tie_type{start}) {
		if ($Debug) { print "    tie already started; prolonged\n"; }
	} elsif ($tie_type{start}) {
		$started_tie{"$text{step} $text{octave}"} = $B;
	} elsif ($tie_type{stop}) {
		my $end_time = $B + $D;
	 	$B = $started_tie{"$text{step} $text{octave}"};
		$D = $end_time - $B;
		if ($Debug) { print "    tie: new B=$B D=$D\n"; }
		push @{$part{$part_id}}, ['note',$B,$D,$channel,$note,$velocity];
	 	delete $started_tie{"$text{step} $text{octave}"};
	} else {
		push @{$part{$part_id}}, ['note',$B,$D,$channel,$note,$velocity];
	}
	if ($lyric_text) {
		push @{$part{$part_id}}, ['lyric',$B,$lyric_text];
		# push @{$part{$part_id}}, ['lyric',$B,"XX"];
	}
	if (! $is_a_grace) {
		$ticksthisbar += int (0.5 + $text{duration}*$TPC/$local_TPC);
		if ($Debug) { print "     ticksthisbar=$ticksthisbar\n"; }
	}
	$instrument_id = q{};
}
sub rest_ { my ($e, $name) = @_;
	if ($Debug) {
		print "rest: text{duration}=$text{duration} ticksthisbar="
		. "$ticksthisbar TPC=$TPC local_TPC=$local_TPC\n";
	}
	$ticksthisbar += int (0.5 + $text{duration}*$TPC/$local_TPC);
	if ($Debug) {
		print "rest: duration=$text{duration} ticksthisbar=$ticksthisbar\n";
	}
}
sub sound_ { my ($e, $name) = @_;
	my $id = $part_id;
	# my $id = $attribute{id};
	if ($Debug) { print "sound: id=$id ticksthisbar=$ticksthisbar\n"; }
	if ($attribute{tempo}) {
		if ($Debug) { print "       tempo=$attribute{tempo}\n"; }
		my $B = $ticksatbarstart + $ticksthisbar;
		my $miditempo = int (0.5 + 60000000/$attribute{tempo});
		push @{$part{$id}}, ['set_tempo', $B, $miditempo];
	}
}
sub time_ { my ($e, $name) = @_;
	my $nn     = 0+$text{beats};
	my $bottom = 0+$text{'beat-type'};
	my $dd=0; while (1) { if (1<<$dd >= $bottom) { last; } $dd++; }
	if ($bottom==8) {
		if ($nn%3==0) {$cc=int(0.5+$TPC*1.5);} else {$cc=int(0.5+$TPC*0.5);}
	} elsif ($bottom == 16) {
		if ($nn%3==0) {$cc=int(.5+$TPC*0.75);} else {$cc=int(.5+$TPC*0.25);}
	} elsif ($bottom == 32) {
		if ($nn%3==0) {$cc=int(.5+$TPC*.375);} else {$cc=int(.5+$TPC*.125);}
	} else { $cc = $TPC * 4.0 / $bottom;
	}
	push @{$part{$part_id}},
		['time_signature', $ticksatbarstart,$nn,$dd,$cc,8];
	if ($Debug) { print "time: $nn/$bottom part_id=$part_id\n"; }
	$miditicksperbeat = $cc;
}

# ------------------ mostly taken from muscript ---------------
sub initialise {
	$miditicksperbeat = $TPC;
	$ticksatbarstart  = 0;
	$tickspreviousbar = 0;
	$ticksthisbar     = $TPC * 4;
	$midibarparts     = '2.4';  # default guesses 4/4 at 100 cro/min
	%step2pitch = ( C=>0,D=>2,E=>4,F=>5,G=>7,A=>9,B=>11, );
}
sub control_change { my ($id, $cha, $num, $percent) = @_;
	my $val = int (0.5 + $percent*1.27);  # 0..100 to 1..127
	if ($val>127) { $val=127; } elsif ($val<0) { $val=0; }
	push @{$part{$id}},['control_change',$ticksatbarstart,$cha,$num,$val];
}

sub midi_write {
	my @tracks;
	foreach my $id (sort keys %part) {
		my ($events_r,$ticks) = MIDI::Score::score_r_to_events_r($part{$id});
		if (!$events_r) { die "MIDI::Score::score_r_to_events_r failed\n"; }
		my $track = MIDI::Track->new( {'events'=>$events_r} );
		if (!$track) { die "MIDI::Track->new failed\n"; }
		push @tracks, $track;
	}
	my $format = 0; if (1 < scalar @tracks) { $format = 1; }
	my $opus = MIDI::Opus->new({'format'=>$format,'ticks'=>$TPC});
	$opus->tracks(@tracks);
	if (!$opus) { die "MIDI::Opus->new failed\n"; }
	$opus->write_to_file( '>-' );
}

__END__

=pod

=head1 NAME

musicxml2mid - Perl script to convert MusicXML to MIDI

=head1 SYNOPSIS

 musicxml2mid Example.xml > Example.mid
 musicxml2mid Example.xml | aplaymidi -
 musicxml2mid -v      # prints version number

=head1 DESCRIPTION

This script converts a musical score in MusicXML format into a MIDI file.
It uses the XML::Parser module to read the xml input,
and the MIDI-Perl module to put together the midi output.

It was written to assist in debugging "muscript -xml".

It handles both partwise and timewise scores,
and seems to work correctly on all the sample MusicXML files
at www.recordare.com, and on all output from "muscript -xml".

There is (was ?) a Python script called musicxml2midi on Sourceforge,
so this script has no final "i", to reduce the amount of confusion...

=head1 OPTIONS

=over 3

=item I<-d>

Generates Debugging output.

=item I<-v>

Prints Version number.

=back

=head1 CHANGES

 20090205 1.7 add lyric events, as suggested by Albert Frantz
          www.key-notes.com
 20070301 1.6 fix bug with a timesig after the start
 20070301 1.5 fix bug in rests
 20070228 1.4 Char handler copes with multiple calls in a single string
 20070227 1.3 correct MIDI Type (format=1) if multiple parts
 20070225 1.2 handles timewise musicxml
 20070224 handles different <divisions> in each <part>
 20070223 handles grace notes, 
 20070223 handles short bars (Dichterliebe01.xml bar 14)
 20070222 1.1 handles channels in recordare & muscript files


=head1 AUTHOR

Peter J Billam  http://www.pjb.com.au/comp/contact.html

=head1 CREDITS

Based on the CPAN modules XML::Parser and MIDI-Perl

=head1 SEE ALSO

MusicXML ( http://www.recordare.com ),
muscript ( http://www.pjb.com.au/muscript ),
XML::Parser, MIDI, MIDI-Perl

=cut

