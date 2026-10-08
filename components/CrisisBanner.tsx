import type { CrisisResource } from "@/types";

export function CrisisBanner({ resources }: { resources: CrisisResource[] }) {
  return (
    <div className="crisis-banner" role="alert">
      <p className="crisis-title">We noticed something difficult</p>
      <p className="crisis-text">
        If you&apos;re having thoughts of harming yourself, please reach out — you don&apos;t have
        to go through this alone.
      </p>
      <ul className="mt-2 space-y-1.5">
        {resources.map((resource) => (
          <li key={resource.name} className="crisis-text">
            <strong>{resource.name}:</strong> {resource.contact}. {resource.description}
          </li>
        ))}
      </ul>
    </div>
  );
}
