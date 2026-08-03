import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto mt-16 max-w-xl text-center">
      <p className="text-7xl font-black text-brand">404</p>
      <h2 className="mt-4 text-2xl font-bold">Page not found</h2>
      <p className="mt-2 text-stone-600">
        The page you requested does not exist.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-lg bg-brand px-5 py-3 font-bold text-white hover:bg-brand-dark"
      >
        Return home
      </Link>
    </div>
  );
}
