import { LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";

export default function Unauthorized() {
  return (
    <div className="mx-auto mt-16 max-w-xl rounded-2xl border-2 border-danger/30 bg-danger-soft p-10 text-center text-danger-dark">
      <LockKeyhole className="mx-auto text-danger" size={34} />
      <h2 className="mt-5 text-3xl font-black">Access not available</h2>
      <p className="mt-3 text-stone-600">
        Your account does not have the role required for this workspace.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block font-bold underline underline-offset-4"
      >
        Return home
      </Link>
    </div>
  );
}
