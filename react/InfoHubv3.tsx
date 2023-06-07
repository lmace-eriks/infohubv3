import React, { useEffect, useRef, useState } from "react";
import { Link, canUseDOM } from "vtex.render-runtime";

// Styles
import styles from "./styles.css";

interface InfoHubv3Props {
  titleText: string;
  fallBack: FallBackObject
  articles: Array<KeywordObject>
  priority: Array<PostObject>
}

interface KeywordObject {
  __editorItemTitle: string;
  keywords: Array<KeywordString>;
  groupType: number;
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
  group: number;
}

interface GroupWithPriority {
  group: number;
  priority: number;
}

interface FallBackObject {
  image: string
  url: string
}

const maximumDesktopPosts = 10;
const maximumMobilePosts = 6;
const groupTypes = [
  "Product",
  "Brand",
  "Product Category",
  "Disipline",
  "Sport",
  "Erik's",
];

const InfoHubv3: StorefrontFunctionComponent<InfoHubv3Props> = ({
  titleText,
  fallBack,
  articles,
  priority
}) => {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Array<PostObject>>([]);
  const [expanded, setExpanded] = useState(false);
  const device = useRef("");

  useEffect(() => {
    if (!canUseDOM) return;

    window.addEventListener("message", messageHandler);

    return () => {
      window.removeEventListener("message", messageHandler);
    };
  });

  const messageHandler = (e: any) => {
    const eventName = e.data.eventName;
    if (eventName === "ebs-infohub-run") resetInfoHub();
  };

  const resetInfoHub = () => {
    setLoading(true);
    setPosts([]);
    buildKeywordList();
  };

  // Takes every keyword from all groups and populates single
  // array with what group they came from.
  const buildKeywordList = () => {
    const keywordList: Array<KeywordInfoObject> = [];

    articles.forEach((topic, index) => {
      topic.keywords.forEach((keyword) => {
        keywordList.push({
          keyword: keyword?.__editorItemTitle?.toLowerCase(),
          group: index,
        });
      });
    });

    searchCurrentURL(keywordList);
  };

  // Searches current URL for any keyword matches.
  const searchCurrentURL = (keywordList: Array<KeywordInfoObject>) => {
    if (!canUseDOM) return;

    device.current = window.innerWidth >= 1025 ? "desktop" : "mobile";

    const currentURL = window.location.href.split(".com/")[1].toLowerCase();
    const groupBuilder: Array<number> = [];

    keywordList.forEach((keyword) => {
      const matchFound = currentURL.includes(keyword.keyword);
      if (matchFound) groupBuilder.push(keyword.group);
    });

    // Escape hatch if no keywords are found.
    if (!groupBuilder.length) {
      setLoading(false);
      return;
    }

    // Removes duplicate group matches.
    const finalGroups = [...new Set(groupBuilder)];

    sortGroups(finalGroups);
  };

  // Sorts groups by priority (group type).
  const sortGroups = (finalGroups: Array<number>) => {
    const unsortedGroups: Array<GroupWithPriority> = [];

    finalGroups.forEach((group) => {
      unsortedGroups.push({
        group,
        priority: articles[group].groupType
      });
    });

    const compare: any = (a: GroupWithPriority, b: GroupWithPriority) => a.priority > b.priority;
    const sortedGroupsWithPriority = unsortedGroups.sort(compare);
    const sortedGroups = sortedGroupsWithPriority.map((group) => group.group);

    buildPosts(sortedGroups);
  };

  // Builds posts array.
  const buildPosts = (finalGroups: Array<number>) => {
    const postBuilder: Array<PostObject> = [];
    finalGroups.forEach((groupNumber) => {
      articles[groupNumber].posts.forEach((post) => {
        postBuilder.push(post);
      });
    });

    // Add Priority posts to beginning of array
    const priorityWithArticles = priority.concat(postBuilder);

    removeInactivePosts(priorityWithArticles);
  };

  // Searches posts array for inactive posts. Posts might be
  // inactivated or not yet scheduled.
  const removeInactivePosts = (postBuilder: Array<PostObject>) => {
    const rightNow = Date.now();

    const postsWithInactive = [...postBuilder];

    postsWithInactive.forEach((post) => {
      const startDate = Date.parse(post.startDate);
      if (startDate) {
        const notYetActive = startDate > rightNow;
        if (notYetActive) post.active = false;
      }
    });

    const activePosts = postsWithInactive.filter((post) => post.active);

    removeDuplicatePosts(activePosts);
  };

  // Removes duplicate posts from post array.
  const removeDuplicatePosts = (postBuilder: Array<PostObject>) => {
    postBuilder.forEach((parentPost, parentIndex) => {
      const checkForTitle = parentPost.__editorItemTitle;

      postBuilder.forEach((post, index) => {
        if (parentIndex !== index) {
          // If Post Title is a duplicate, remove post. Other properties are ignored.
          const matchFound = post.__editorItemTitle === checkForTitle;
          if (matchFound) {
            postBuilder.splice(index, 1);
          }
        }
      });
    });

    buildRender(postBuilder);
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

  const handleClick = () => {
    setExpanded(!expanded);
  };

  const FallBack = () => (
    <div className={styles.fallBackContainer}>
      {fallBack.url ? <Link href={fallBack.url} target="_blank" rel="noreferrer" className={styles.fallBackLink}>
        <img src={fallBack.image} height={120} width={1536} className={styles.fallBackImage} />
      </Link> :
        <img src={fallBack.image} height={120} width={1536} className={styles.fallBackImage} />}
    </div>
  )

  if (loading) return <></>;
  if (!posts.length || priority.length === posts.length) return <FallBack />;

  return (
    <div className={styles.container}>
      {titleText && <div className={styles.title}>{titleText}</div>}
      <div style={{ height: expanded ? `16rem` : `7.5rem` }} className={styles.window}>
        <div className={posts.length <= 5 ? styles.flexWrapper : styles.gridWrapper}>
          {posts.map((post, index) => (
            <Link
              key={`post-${index}`}
              href={post.url}
              target="_blank"
              rel="noreferrer"
              className={styles.link}
            >
              <img
                src={post.image}
                alt=""
                width={250}
                height={110}
                className={styles.image}
              />
              <div className={styles.text}>{post.__editorItemTitle}</div>
            </Link>
          ))}
        </div>
      </div>
      {posts.length > 5 && (
        <button onClick={handleClick} className={styles.button}>
          {`Show ${expanded ? `Fewer` : `More`} Articles`}
        </button>
      )}
    </div>
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
            title: "Image - 250px 110px",
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
      title: "Article Groups",
      type: "array",
      items: {
        properties: {
          __editorItemTitle: {
            title: "Internal Group Name",
            type: "string",
            description: "Non-functional name. Exists for readability.",
          },
          groupType: {
            title: "Group Type",
            type: "number",
            enum: groupTypes.map((_, index) => index),
            enumNames: groupTypes.map((type) => type),
            default: groupTypes.length - 1,
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
                  default: true
                },
                image: {
                  title: "Image - 250px 110px",
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
    fallBack: {
      title: "FallBack Image",
      type: "object",
      properties: {
        image: {
          title: "Fallback Image - 1536px 120px",
          type: "string",
          widget: { "ui:widget": "image-uploader" }
        },
        url: {
          title: "Fallback URL",
          description: "Optional",
          type: "string",
          widget: { "ui:widget": "textarea" }
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
