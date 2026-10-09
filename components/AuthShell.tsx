import { AppName } from "@/components/AppName";
import { CloudMascot } from "@/components/CloudMascot";

export function AuthShell({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  return (
    <main className="content narrow flex flex-col justify-center">
      <div className="mb-6 text-center">
        <div className="mb-3 flex justify-center">
          <CloudMascot size={80} />
        </div>
        <h1 className="mb-1.5 text-2xl font-semibold text-blue">
          <AppName />
        </h1>
        <p className="px-2 text-sm leading-relaxed text-text3">{subtitle}</p>
      </div>
      {children}
    </main>
  );
}
