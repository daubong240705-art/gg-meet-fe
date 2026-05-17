export type MeetingParticipantStatus =
  | "ACCEPT"
  | "WAITING"
  | "REJECT"
  | "REJECTED"
  | (string & {});

export type MeetingHost = {
  id?: number | null;
  fullName?: string | null;
  email?: string | null;
  role?: Role | null;
};

export type CreateMeetingResponseData = {
  host?: MeetingHost | null;
  meetingCode?: string | null;
  roomSid?: string | null;
  title?: string | null;
  status?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  livekitToken?: string | null;
  meetingToken?: string | null;
  participantStatus?: string | null;
};

export type MeetingStatus = "SCHEDULED" | "ACTIVE" | "ENDED" | (string & {});

export type PagedResponse<T> = {
  content?: T[] | null;
  page?: number | null;
  size?: number | null;
  totalElements?: number | null;
  totalPages?: number | null;
  last?: boolean | null;
};

export type UpcomingMeetingResponseData = {
  title?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  hostName?: string | null;
  meetingCode?: string | null;
  status?: MeetingStatus | null;
};

export type UpcomingMeetingsResponseData = PagedResponse<UpcomingMeetingResponseData>;

export type ScheduleMeetingRequest = {
  title: string;
  isScheduled: true;
  meetingDate: string;
  meetingTime: string;
  description: string;
  emailList: string[];
};

export type ScheduleMeetingResponseData = CreateMeetingResponseData;
export type JoinMeetingResponseData = CreateMeetingResponseData;
export type JoinRequestStatusResponseData = JoinMeetingResponseData;

export type VerifyMeetingResponseData = {
  meetingCode?: string | null;
  title?: string | null;
  status?: string | null;
  host?: MeetingHost | null;
};

export type WaitingRoomRequestData = {
  participantId?: number | null;
  name?: string | null;
  email?: string | null;
  participantStatus?: string | null;
  requestedAt?: string | null;
};

export type LeaveMeetingResponseData = null;
export type EndMeetingResponseData = null;

export type MeetingApiFieldError = {
  field: string;
  message: string;
};

export type GuestJoinRequest = {
  guestId: string;
  guestName: string;
};

export type CancelJoinRequest = {
  guestId?: string | null;
  guestName?: string | null;
  targetParticipantId?: number | null;
  targetName?: string | null;
  meetingToken?: string | null;
};

export type MeetingRequestOptions = {
  keepalive?: boolean;
};
