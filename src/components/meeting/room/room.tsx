import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorX,
  MoreVertical,
  MessageSquare,
  Users,
  Phone,
  Settings,
  Copy,
  Grid3x3,
  Maximize2,
  Volume2,
  VolumeX,
  Hand,
  CheckCircle2,
  Monitor
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { motion, AnimatePresence } from 'motion/react';

export function MeetingRoomPage() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'speaker'>('grid');
  const [copied, setCopied] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [sharingUser, setSharingUser] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setMeetingDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const participants = [
    { id: 1, name: 'You', isMuted: !isMicOn, isVideoOff: !isVideoOn, isHost: true, isSpeaking: true },
    { id: 2, name: 'Sarah Chen', isMuted: false, isVideoOff: false, isHost: false, isSpeaking: false },
    { id: 3, name: 'Mike Johnson', isMuted: true, isVideoOff: false, isHost: false, isSpeaking: false },
    { id: 4, name: 'Emily Davis', isMuted: false, isVideoOff: true, isHost: false, isSpeaking: false },
    { id: 5, name: 'Alex Turner', isMuted: false, isVideoOff: false, isHost: false, isSpeaking: false },
  ];

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(`https://meetly.app/join/${meetingId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEndCall = () => {
    navigate('/dashboard');
  };

  const handleScreenShare = () => {
    if (!isScreenSharing) {
      // Start screen sharing
      setIsScreenSharing(true);
      setSharingUser('You');
    } else {
      // Stop screen sharing
      setIsScreenSharing(false);
      setSharingUser(null);
    }
  };

  const renderParticipantCard = (participant: typeof participants[0], isMinimized = false) => (
    <Card className={`w-full h-full ${isMinimized ? 'min-h-[120px]' : 'min-h-[280px]'} overflow-hidden bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center relative`}>
      {participant.isVideoOff ? (
        <div className="flex flex-col items-center gap-3">
          <div className={`${isMinimized ? 'w-12 h-12 text-lg' : 'w-20 h-20 text-2xl'} rounded-full bg-primary text-white flex items-center justify-center font-semibold`}>
            {participant.name.charAt(0)}
          </div>
          {!isMinimized && <p className="font-medium">{participant.name}</p>}
        </div>
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
          <div className="text-center">
            <div className={`${isMinimized ? 'w-12 h-12 text-lg' : 'w-20 h-20 text-2xl'} rounded-full bg-primary text-white flex items-center justify-center font-semibold mx-auto ${!isMinimized && 'mb-3'}`}>
              {participant.name.charAt(0)}
            </div>
            {!isMinimized && (
              <>
                <p className="font-medium">{participant.name}</p>
                <p className="text-sm text-muted-foreground">Camera active</p>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Participant Info Overlay */}
      <div className={`absolute bottom-0 left-0 right-0 ${isMinimized ? 'p-2' : 'p-4'} bg-gradient-to-t from-black/60 to-transparent`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-white font-medium ${isMinimized ? 'text-xs' : 'text-sm'}`}>
              {participant.name}
            </span>
            {participant.isHost && !isMinimized && (
              <span className="px-2 py-0.5 bg-primary/80 text-white text-xs rounded">
                Host
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {participant.isMuted ? (
              <div className={`${isMinimized ? 'w-5 h-5' : 'w-6 h-6'} rounded bg-red-500/90 flex items-center justify-center`}>
                <MicOff className={`${isMinimized ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-white`} />
              </div>
            ) : participant.isSpeaking ? (
              <div className={`${isMinimized ? 'w-5 h-5' : 'w-6 h-6'} rounded bg-green-500/90 flex items-center justify-center`}>
                <Mic className={`${isMinimized ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-white`} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Hover Actions */}
      {!isMinimized && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" className="w-8 h-8 p-0 bg-black/40 hover:bg-black/60 text-white">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      )}
    </Card>
  );

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="bg-card border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium">{formatDuration(meetingDuration)}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Meeting ID:</span>
            <span className="text-sm font-mono">{meetingId}</span>
            <button
              onClick={copyMeetingLink}
              className="text-primary hover:text-primary/80 transition-colors"
            >
              {copied ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'speaker' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('speaker')}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-2" />
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          {isScreenSharing ? (
            /* Screen Sharing View */
            <div className="h-full flex flex-col gap-4">
              {/* Main Screen Share Area */}
              <div className="flex-1 relative">
                <Card className="w-full h-full overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 relative group">
                  {/* Screen Share Content */}
                  <div className="w-full h-full flex items-center justify-center p-12">
                    <div className="text-center space-y-6">
                      <div className="w-32 h-32 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
                        <Monitor className="w-16 h-16 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold text-white mb-2">
                          {sharingUser === 'You' ? 'You are presenting' : `${sharingUser} is presenting`}
                        </h3>
                        <p className="text-slate-300">
                          {sharingUser === 'You' 
                            ? 'Your screen is being shared with all participants' 
                            : 'Screen content would appear here'}
                        </p>
                      </div>
                      {/* Mock presentation content */}
                      <div className="mt-8 grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                        <div className="aspect-video bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                          <div className="h-full flex items-center justify-center text-slate-400">
                            Slide 1
                          </div>
                        </div>
                        <div className="aspect-video bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                          <div className="h-full flex items-center justify-center text-slate-400">
                            Slide 2
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Screen Share Info Banner */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <Monitor className="w-4 h-4 text-white" />
                        <span className="text-white text-sm font-medium">
                          {sharingUser === 'You' ? 'Sharing your screen' : `${sharingUser}'s screen`}
                        </span>
                      </div>
                    </div>

                    {sharingUser === 'You' && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={handleScreenShare}
                        className="shadow-lg"
                      >
                        <MonitorX className="w-4 h-4" />
                        Stop sharing
                      </Button>
                    )}
                  </div>
                </Card>
              </div>

              {/* Participant Thumbnails Strip */}
              <div className="h-32 flex gap-3 overflow-x-auto pb-2">
                {participants.map((participant) => (
                  <motion.div
                    key={participant.id}
                    className="flex-shrink-0 w-40 group"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderParticipantCard(participant, true)}
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            /* Normal Grid View */
            <div className={`grid gap-4 h-full ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr'
                : 'grid-cols-1'
            }`}>
              {participants.map((participant) => (
                <motion.div
                  key={participant.id}
                  layout
                  className="relative group"
                >
                  {renderParticipantCard(participant, false)}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar - Chat/Participants */}
        <AnimatePresence>
          {(showChat || showParticipants) && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l border-border bg-card overflow-hidden"
            >
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-border flex gap-2">
                  <Button
                    variant={showParticipants ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setShowParticipants(true);
                      setShowChat(false);
                    }}
                    className="flex-1"
                  >
                    <Users className="w-4 h-4" />
                    Participants ({participants.length})
                  </Button>
                  <Button
                    variant={showChat ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setShowChat(true);
                      setShowParticipants(false);
                    }}
                    className="flex-1"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat
                  </Button>
                </div>

                {showParticipants && (
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-2">
                      {participants.map((participant) => (
                        <div
                          key={participant.id}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                        >
                          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-medium">
                            {participant.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{participant.name}</p>
                              {participant.isHost && (
                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded">
                                  Host
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {participant.isMuted ? (
                              <MicOff className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Mic className="w-4 h-4 text-green-500" />
                            )}
                            {participant.isVideoOff && (
                              <VideoOff className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showChat && (
                  <div className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                          S
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-medium text-sm">Sarah Chen</span>
                            <span className="text-xs text-muted-foreground">9:45 AM</span>
                          </div>
                          <p className="text-sm bg-muted p-3 rounded-lg">
                            Great presentation! Looking forward to the next steps.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                          M
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-medium text-sm">Mike Johnson</span>
                            <span className="text-xs text-muted-foreground">9:46 AM</span>
                          </div>
                          <p className="text-sm bg-muted p-3 rounded-lg">
                            Agreed! Can someone share the slides?
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 border-t border-border">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Type a message..."
                          className="flex-1 px-4 py-2 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <Button>Send</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Bar */}
      <div className="bg-card border-t border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden md:block">
              Team Standup
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={isMicOn ? 'secondary' : 'danger'}
              onClick={() => setIsMicOn(!isMicOn)}
              className="w-12 h-12 p-0 rounded-full"
            >
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>

            <Button
              variant={isVideoOn ? 'secondary' : 'danger'}
              onClick={() => setIsVideoOn(!isVideoOn)}
              className="w-12 h-12 p-0 rounded-full"
            >
              {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>

            <Button
              variant={isScreenSharing ? 'primary' : 'secondary'}
              onClick={handleScreenShare}
              className="w-12 h-12 p-0 rounded-full"
            >
              <MonitorUp className="w-5 h-5" />
            </Button>

            <div className="w-px h-8 bg-border mx-2" />

            <Button
              variant={showParticipants ? 'primary' : 'secondary'}
              onClick={() => {
                setShowParticipants(!showParticipants);
                setShowChat(false);
              }}
              className="w-12 h-12 p-0 rounded-full relative"
            >
              <Users className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                {participants.length}
              </span>
            </Button>

            <Button
              variant={showChat ? 'primary' : 'secondary'}
              onClick={() => {
                setShowChat(!showChat);
                setShowParticipants(false);
              }}
              className="w-12 h-12 p-0 rounded-full"
            >
              <MessageSquare className="w-5 h-5" />
            </Button>

            <Button
              variant="secondary"
              className="w-12 h-12 p-0 rounded-full"
            >
              <Hand className="w-5 h-5" />
            </Button>

            <Button
              variant="secondary"
              className="w-12 h-12 p-0 rounded-full"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>

          <Button
            variant="danger"
            onClick={handleEndCall}
            className="px-6"
          >
            <Phone className="w-5 h-5" />
            End call
          </Button>
        </div>
      </div>
    </div>
  );
}