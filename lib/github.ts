/**
 * The repo's star count for the header's GitHub button. Cached and refreshed
 * at most once an hour, so the landing page stays static and the unauthenticated
 * GitHub API rate limit is never a concern. Returns null when GitHub can't be
 * reached, and the button falls back to the bare icon.
 */
export const getRepoStars = async (): Promise<number | null> => {
  try {
    const res = await fetch("https://api.github.com/repos/thordursk/gauge-ui", {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const { stargazers_count } = (await res.json()) as {
      stargazers_count?: number
    }
    return typeof stargazers_count === "number" ? stargazers_count : null
  } catch {
    return null
  }
}
