import { Link } from "wouter";

export default function Welcome() {
  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Welcome</h1>
      </div>
      <div className="mt-4">
        <p className="text-sm md:text-base">
          You can start by <Link to="/catalogues/new">adding a catalogue</Link>.
        </p>
      </div>
    </>
  );
}
