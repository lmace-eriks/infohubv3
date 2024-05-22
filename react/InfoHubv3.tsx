import React, { useEffect, useRef, useState } from "react";
import { Link, canUseDOM } from "vtex.render-runtime";

// Styles
import styles from "./styles.css";

interface InfoHubv3Props {
  titleText: string;
  articles: Array<KeywordObject>
  priority: Array<PostObject>
}

interface KeywordObject {
  __editorItemTitle: string;
  keywords: Array<KeywordString>;
  topicType: number;
  posts: Array<PostObject>;
}

interface KeywordString {
  __editorItemTitle: string;
}

interface PostObject {
  startDate: string;
  active: boolean;
  __editorItemTitle: string;
  image: string;
  url: string;
}

interface KeywordInfoObject {
  keyword: string;
  topic: number;
}

interface TopicAndPriority {
  topic: number;
  priority: number;
}

interface WindowObject {
  height: number
  expanded: boolean
}

const maximumDesktopPosts = 10;
const maximumMobilePosts = 6;
const topicTypes = [
  "Product",
  "Brand",
  "Product Category",
  "Disipline",
  "Sport",
  "Erik's",
];

const imageSize: { width: number, height: number } = {
  width: 250,
  height: 110
}

const initialWindowState: WindowObject = {
  height: imageSize.height + 2, // 2px for border.
  expanded: false
}

const InfoHubv3: StorefrontFunctionComponent<InfoHubv3Props> = ({ titleText, articles, priority }) => {
  const showInfoHub = () => {
    // Hide InfoHub on specific pages with URL parameter. - LM
    if (!canUseDOM) return false;

    const params = new URLSearchParams(document.location.search);
    const ih = params.get("ih");
    return ih === "0" ? false : true;
  }

  if (!showInfoHub()) return <></>;

  // State
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Array<PostObject>>([]);
  const [windowProps, setWindowProps] = useState<WindowObject>(initialWindowState);

  // Refs
  const device = useRef<"desktop" | "mobile">("mobile");
  const wrapper = useRef<HTMLUListElement>(null);
  const activePriorityPosts = useRef(0);

  useEffect(() => {
    if (!canUseDOM) return;
    window.addEventListener("message", messageHandler);
    return () => window.removeEventListener("message", messageHandler);
  });

  const messageHandler = (e: MessageEvent) => {
    if (!showInfoHub()) return;

    const eventName = e.data.eventName;
    if (eventName === "ebs-infohub-run") resetInfoHub();
  };

  const resetInfoHub = () => {
    setLoading(true);
    setPosts([]);
    buildKeywordList();
  };

  // Takes every keyword from all topics and populates single
  // array with what topic they came from.
  const buildKeywordList = () => {
    const keywordList: Array<KeywordInfoObject> = [];

    // O(n * m)
    articles.forEach((article, index) => {
      const keywords = article.keywords.map((keyword) => keyword.__editorItemTitle);
      keywords.forEach(keyword => {
        keywordList.push({
          keyword: keyword.toLowerCase(),
          topic: index
        })
      })
    });

    searchCurrentURL(keywordList);
  };

  // Searches current URL for any keyword matches.
  const searchCurrentURL = (keywordList: Array<KeywordInfoObject>) => {
    if (!canUseDOM) return;

    const currentURL = (window.location.pathname + window.location.search).toLowerCase();

    // Builds [topicBuilder] with numbers of topics to populate.
    const topicBuilder: Array<number> = keywordList.map(keyword => (
      currentURL.includes(keyword.keyword) ? keyword.topic : -1
    )).filter(topicNumber => topicNumber !== -1);

    // Escape hatch if no keywords are found.
    if (!topicBuilder.length) {
      setLoading(false);
      return;
    }

    // Removes duplicate topic matches.
    const finalTopics = [...new Set(topicBuilder)];

    // Setting device in this function only to make use of the canUseDOM.
    device.current = window.innerWidth >= 1026 ? "desktop" : "mobile";

    sortTopics(finalTopics);
  };

  // Sorts topics by priority (topic type).
  const sortTopics = (finalTopics: Array<number>) => {
    const unsortedTopics: TopicAndPriority[] = finalTopics.map(topic => (
      {
        topic,
        priority: articles[topic].topicType
      }
    ));

    const comparisonFunction: any = (a: TopicAndPriority, b: TopicAndPriority) => a.priority > b.priority;
    const sortedTopicsWithPriority = unsortedTopics.sort(comparisonFunction);
    const sortedFinalTopics = sortedTopicsWithPriority.map((topicAndPriorityObject) => topicAndPriorityObject.topic);

    buildPosts(sortedFinalTopics);
  };

  // Builds posts array.
  const buildPosts = (sortedFinalTopics: Array<number>) => {
    const postBuilder = sortedFinalTopics.reduce<PostObject[]>((accumulator: PostObject[], current: number) => {
      const currentPostList = articles[current].posts;
      return [...accumulator, ...currentPostList];
    }, []);

    // Add Priority posts to beginning of array.
    const priorityWithArticles = [...priority, ...postBuilder];

    // Determine number of active priority posts for final render check.
    // This is important because we do not want only priority
    // posts to render if there are no organic results.
    activePriorityPosts.current = priority.reduce((accumulator, post) => accumulator + (post.active ? 1 : 0), 0);

    removeInactivePosts(priorityWithArticles);
  };

  // Searches posts array for inactive posts. Posts might be inactivated or scheduled for the future.
  const removeInactivePosts = (postBuilder: Array<PostObject>) => {
    const rightNow = Date.now();

    // Find posts scheduled for the future and set them to active: false
    const postsWithInactive = postBuilder.map(post => {
      const tempPost = { ...post };
      const startDate = Date.parse(post.startDate);

      if (startDate) {
        const notYetActive = startDate > rightNow;
        tempPost.active = notYetActive ? false : true;
      }

      return tempPost;
    });

    // Filter out all inactive posts.
    const activePosts = postsWithInactive.filter((post) => post.active);

    removeDuplicatePosts(activePosts);
  };

  const removeDuplicatePosts = (activePosts: Array<PostObject>) => {
    const postMap: Map<string, PostObject> = new Map();

    // Set post title as the map key and the PostObject as the value.
    for (const post of activePosts) postMap.set(post.__editorItemTitle, post);

    // post[1] contains the PostObject
    const uniquePosts = [...postMap].map(post => post[1]);

    buildRender(uniquePosts);
  };

  // Determine how to render based on user's window width.
  const buildRender = (uniquePostArray: Array<PostObject>) => {
    const numberOfPosts = uniquePostArray.length;

    if (device.current === "desktop") {
      if (numberOfPosts > maximumDesktopPosts) {
        uniquePostArray.length = maximumDesktopPosts;
      }
    }
    if (device.current === "mobile") {
      if (numberOfPosts > maximumMobilePosts) {
        uniquePostArray.length = maximumMobilePosts;
      }
    }

    setPosts(uniquePostArray);
    setLoading(false);
  };

  const handleWindowExpand = () => {
    if (windowProps.expanded) {
      setWindowProps(initialWindowState);
    } else {
      setWindowProps({ height: wrapper.current?.offsetHeight!, expanded: true });
    }
  };

  if (loading) return <></>;

  // Empty Posts Array 
  if (!posts.length) return <></>;

  // Priority Posts are the only valid items in array
  if (posts.length === activePriorityPosts.current) return <></>;

  return (
    <section aria-labelledby="title-text" className={styles.container}>
      {titleText ?
        <h2 id="title-text" className={styles.title}>{titleText}</h2> :
        <h2 id="title-text" className={styles.srOnly}>Related Articles</h2>}
      <div id="article-window" style={{ height: `${windowProps.height}px` }} className={styles.window}>
        <ul ref={wrapper} className={posts.length <= 5 ? styles.flexWrapper : styles.gridWrapper}>
          {posts.map((post, index) => (
            <li key={`post-${index}`} className={styles.listItem}>
              <Link href={post.url} target="_blank" rel="noreferrer" className={styles.link} >
                <img src={post.image} alt="" width={imageSize.width} height={imageSize.height} className={styles.image} />
                <div className={styles.text}>
                  {post.__editorItemTitle}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {posts.length > 5 && (
        <button aria-expanded={windowProps.expanded} aria-controls="article-window" onClick={handleWindowExpand} className={styles.button}>
          {`Show ${windowProps.expanded ? `Fewer` : `More`} Articles`}
        </button>
      )}
    </section>
  );
};

// Priority Hierarchy should be...
// Product - Brooks B17 Saddle
// Brand - Brooks Brand Guide
// Product Category - Saddle Buying Guide
// Dicipline - How to Commute By Bike
// Sport - Bicycle Buying Guide
// Eriks - Store Locator

InfoHubv3.schema = {
  title: "InfoHubv3",
  description: "",
  type: "object",
  properties: {
    priority: {
      title: "Priority Posts",
      type: "array",
      items: {
        properties: {
          startDate: {
            title: "Start Date",
            type: "string",
            description: 'Optional | Press "Backspace" to remove.',
            format: "date",
          },
          active: {
            title: "Visible?",
            type: "boolean",
            default: true,
          },
          image: {
            title: `Image - ${imageSize.width}px ${imageSize.height}px`,
            type: "string",
            widget: { "ui:widget": "image-uploader" },
          },
          __editorItemTitle: {
            title: "Text",
            type: "string",
            widget: { "ui:widget": "textarea" },
          },
          url: {
            title: "URL",
            type: "string",
            widget: { "ui:widget": "textarea" },
          }
        }
      }
    },
    articles: {
      title: "Article Topics",
      type: "array",
      items: {
        properties: {
          __editorItemTitle: {
            title: "Internal Group Name",
            type: "string",
            description: "Non-functional name. Exists for readability.",
          },
          topicType: {
            title: "Topic Type",
            type: "number",
            enum: topicTypes.map((_, index) => index),
            enumNames: topicTypes.map((type) => type),
            default: topicTypes.length - 1,
            widget: { "ui:widget": "radio" },
          },
          keywords: {
            title: "Keywords To Match",
            type: "array",
            items: {
              properties: {
                __editorItemTitle: {
                  title: "Keyword",
                  description:
                    "Single Keyword to find in URL. No spaces. Case Insensitive, GrAveL is equal to gravel. Example: Electric",
                  type: "string",
                },
              },
            },
          },
          posts: {
            title: "Posts",
            type: "array",
            required: ["__editorItemTitle", "url"],
            items: {
              required: ["__editorItemTitle", "url"],
              properties: {
                startDate: {
                  title: "Start Date",
                  type: "string",
                  description: 'Optional | Press "Backspace" to remove.',
                  format: "date",
                },
                active: {
                  title: "Visible?",
                  type: "boolean",
                  default: true
                },
                image: {
                  title: `Image - ${imageSize.width}px ${imageSize.height}px`,
                  type: "string",
                  widget: { "ui:widget": "image-uploader" },
                },
                __editorItemTitle: {
                  title: "Text",
                  type: "string",
                  widget: { "ui:widget": "textarea" },
                },
                url: {
                  title: "URL",
                  type: "string",
                  widget: { "ui:widget": "textarea" }
                }
              }
            }
          }
        }
      }
    },
    titleText: {
      title: "Infohub Title Text",
      type: "string",
      description: "Optional"
    },
  }
};

export default InfoHubv3;
