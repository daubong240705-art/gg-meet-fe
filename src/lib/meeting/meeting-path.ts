// Single source of truth for in-app links to a meeting. The desktop build is a
// static export without the dynamic /[meetingCode] route, so it navigates via
// the static /join page instead. Always route through this helper.
export const meetingHref = (meetingCode: string) => {
    const encodedMeetingCode = encodeURIComponent(meetingCode);

    if (typeof window !== "undefined" && window.desktop?.isElectron) {
        return `/join?code=${encodedMeetingCode}`;
    }

    return `/${encodedMeetingCode}`;
};
