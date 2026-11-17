import { MemberTabBar } from "@/components/member-tab-bar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MemberTabBar />
    </>
  );
}
