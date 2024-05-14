---
title: Custom interactive list elements with Qt
date: 2022-01-15
summary: It's more difficult than you might think.
aliases:
  - /2022/01/15/qt-view-delegates.html
---

Qt has a [Model/View Framework](https://doc.qt.io/qt-6/model-view-programming.html) that can be used to create a GUI list widget that acts as a view into some data, and avoid rendering any UI for list elements that are not visible. It's generally pretty straightforward to use, but I found that getting a list of elements with custom variable-height UI involving various sub-widgets, icons and rich text to work was a different story.

My approach and the difficulty I encountered are probably fairly specific to my requirements, so here they are:

* A virtual list, i.e. one where CPU and memory usage of the list's UI scales better than linearly with the length of the list.
* The list must be dynamically filterable so that only a subset of items may be displayed.
* The data associated with each item must be dynamically filterable, so that only a subset of an item's data may be displayed.
* Each list item needs to be displayed as a widget that includes some simple variable-length (but probably less than 255 characters long) text, between zero and seven icons, zero or more rendered variable-length rich text strings, and a separate area for a grid of variable-length strings, with a variable number of rows in the grid. Notably, there are no user inputs involved.
* The icons in a list item widget need tooltips that are displayed when the user hovers over an icon, to help the user learn what the icon represents.
* Some of the text strings in a list item widget may contain hyperlinks that the user must be able to click on to open in their web browser.
* When displaying the list items, there should be no horizontal scroll bars visible past some sensible minimum width. Because each list item contains variable-length text, this means the text will need to wrap and so items may have different heights to one another but may also change height in response to changes in viewport size.

I think that's it. From my experience working with HTML/CSS/JavaScript virtual lists, the variable-height requirement seems to be the trickiest to support. Fortunately, Qt's item views support that out of the box.

Unfortunately, while Qt has documentation and examples covering how to render custom shapes and text, it doesn't seem to mention anywhere how to use render custom widgets as list items, or how to get reasonable performance while using them.

> Note: for the rest of this article I'll generally refer to the custom widgets as "cards", to make it clear that I'm talking about a specific type of widget that's used to display model item data, as opposed to any subclass of `QWidget`.

## Choosing an approach

If you want to display custom UI for a model item in a view, it looks like there are two approaches:

1. Construct a widget and call `QAbstractItemView::setIndexWidget()`.
2. Subclass `QStyledItemDelegate` and call `QAbstractItemView::setItemDelegate()` or a related method.

The first approach is definitely easier to get started with, as you can just populate your model and then construct your card for each index in the model, it's similar to the approach you'd take if you weren't using a model and were just using the cards in a layout in a scrollable area.

Unfortunately, it doesn't scale well in two ways:

1. Each item needs a card, which hangs around in memory, so memory usage is proportional to the size of the list, and it's no longer really a virtual list. It's also not easy to avoid having to create all the cards upfront, and that may introduce significant lag.
2. Nothing ties the item's state to the card's state, so if the item changes you need to manually update the card. At first this was manageable, but as the number of ways in which a item's state could change increased, it got very messy to keep everything in sync.

Subclassing `QStyledItemDelegate` definitely involves more up-front code, and it's much less obvious how to use the lower-level API it provides to display a custom widget, but it does solve the problems that `QAbstractItemView::setIndexWidget()` has.

## Displaying a custom widget

The first problem I had was that `QStyledItemDelegate` provides a `paint()` method for you to implement, but all the examples I could find in Qt's documentation just showed how to paint basic shapes or text. I wanted to paint a custom widget (which I had already implemented as a subclass of `QFrame`) with a flexible layout of text, icons, rich text, a group box, a grid layout, tooltips, etc. This seems like it's probably not an uncommon requirement, so it's bizarre that the basic solution doesn't seem to be documented:

```cpp
// The widget width should be the width of the available space, unless the
// widget's minimum width is greater. The height should be the minimum height
// required for the width.
QSize calculateSize(QWidget* widget,
                    const QStyleOptionViewItem& option) {
  auto minLayoutWidth = widget->layout()->minimumSize().width();
  auto rectWidth = option.rect.width();

  auto width = rectWidth > minLayoutWidth ? rectWidth : minLayoutWidth;
  auto height = widget->hasHeightForWidth()
                    ? widget->layout()->minimumHeightForWidth(width)
                    : widget->minimumHeight();

  return QSize(width, height);
}

class Card : public QFrame {
public:
  Card(QWidget * parent, const QModelIndex& index): QFrame(parent) {
    //...
  }

  //...
};

class CardDelegate : public QStyledItemDelegate {
  Q_OBJECT
public:
  CardDelegate(QListView* parent) : QStyledItemDelegate(parent) {
    //...
  }

  void paint(QPainter* painter,
             const QStyleOptionViewItem& option,
             const QModelIndex& index) const override {
    if (!index.isValid()) {
      // If the index isn't valid just do whatever the default implementation
      // does.
      return QStyledItemDelegate::paint(painter, option, index);
    }

    // This is needed or you'll end up with the wrong style settings.
    auto styleOption = QStyleOptionViewItem(option);
    initStyleOption(&styleOption, index);

    // This drawControl is needed to draw the styling that's used to
    // indicate when an item is hovered over or selected. There are probably
    // other drawControls to cover other states that I'm missing, but I haven't
    // noticed.
    styleOption.widget->style()->drawControl(
        QStyle::CE_ItemViewItem, &styleOption, painter, styleOption.widget);

    // Save the painter state to restore it after painting the card, so that
    // painting the card doesn't mess up any state for future paints.
    painter->save();

    // Move the painter into the right starting position.
    painter->translate(styleOption.rect.topLeft());

    // Create the card, using whatever data is necessary from the given
    // index.
    QWidget * widget = new Card(parent->viewport(), index);

    // Calculate the card's size based on the available space (given in
    // styleOption).
    auto sizeHint = calculateSize(widget, styleOption);

    widget->setFixedSize(sizeHint);

    // This is where the painting magic happens.
    widget->render(painter, QPoint(), QRegion(), QWidget::DrawChildren);

    // Now restore the old state.
    painter->restore();
  }

  QSize sizeHint(const QStyleOptionViewItem& option,
                 const QModelIndex& index) const override {
    if (!index.isValid()) {
      return QStyledItemDelegate::sizeHint(option, index);
    }

    // This is needed or you'll end up with the wrong style settings.
    auto styleOption = QStyleOptionViewItem(option);
    initStyleOption(&styleOption, index);

    // Create the card, using whatever data is necessary from the given
    // index.
    QWidget * widget = new Card(parent->viewport(), index);

    // Calculate the card's size based on the available space (given in
    // styleOption).
    auto sizeHint = calculateSize(widget, styleOption);

    widget->deleteLater();

    return sizeHint;
  }
};

class MainWindow : public QMainWindow {
  Q_OBJECT
//...
private:
  //...
  QListView *listView;
  QAbstractItemModel *itemModel;

  void setupUi() {
    //...

    listView = new QListView(this);
    // Also construct the item model (not shown).

    listView->setModel(itemModel);

    // Resize mode must be set to Adjust or else the items widths can grow but
    // never shrink past their starting size.
    listView->setResizeMode(QListView::Adjust);

    // Word wrap must be enabled as although we use a custom delegate, with
    // word wrap set to false the delegate's sizeHint() method is always called
    // with the initial size of the view's viewport, not the actual current
    // size, leading to layout issues.
    listView->setWordWrap(true);

    listView->setItemDelegate(new CardDelegate(listView));

    //...
  }
}
```

Note the non-obvious configuration changes that need to be made on the delegate's view for the above to work correctly:

* `QListView::setResizeMode()` needs to be called with `QListView::Adjust` or else the widgets won't get narrower than their initial width if you make the viewport narrower. They'll still expand and contract so long as you change the width above their initial width though.
* `QListView::setWordWrap()` needs to be called with `true` or else the `option` passed to `QStyledItemDelegate::sizeHint()` will have a `rect` value that never changes from its initial value, which means you can't get the real width (or height) available to the item. `QStyledItemDelegate::paint()`'s `option` *does* get the correct `rect` value, which leads to gaps and/or overlapping items at non-initial widths when using items that have width-dependent heights. I only found that `wordWrap` was involved thanks to [this bug report](https://bugreports.qt.io/browse/QTBUG-11227).

Getting `Card` to take up the correct amount of space took a lot of trial and error. In the end, I found the following helped:

* Setting `wordWrap` to `true` on `QLabel` widgets of variable size, i.e. `label->setWordWrap(true);`. Without that the label text won't wrap, so I'd get a horizontal scroll bar when I didn't want one.
* Set the minimum size constraint for the `Card`'s layout, e.g. `layout->setSizeConstraint(QLayout::SetMinimumSize);`. Without calling this, I found that cards with no content would have zero height and so weren't visible in the list.
* Explicitly triggering the layout recalculations after making content changes, by calling `layout()->activate()` for the for the card and its child container widgets. Without those calls, cards did't resize correctly from their initial minimum size to fit their new content.

I didn't have to set the size constraint or explicitly activate the layout for any widgets used outside of the delegate, so I don't really understand why it was needed for the cards.

Even with all of the above, there are a few big problems with this approach, which I'll cover in the sections below.

## Fast paints

The first big problem is that `paint()` and `sizeHint()` are called **very** frequently, and so need to be fast or you end up with a very slow and laggy UI. Constructing and populating is surprisingly slow: in my case, one instance of `Card` takes about 15 milliseconds, and while `paint()` and `sizeHint()` are usually only called for items that are visible, `sizeHint()` is also called for every item in the list whenever any data changes.

With the code above, scrolling around was useable but noticeably not smooth, and any filtering or other data changes caused the UI to lag while every item's size hint was recalculated. Not to mention that the constant churn happily maxed out one CPU core with the application just running in the background without any user input.

The first thing I did was to split out populating the `Card` object into a separate function, so that a single `Card` object could be constructed in `CardDelegate`'s constructor and then re-used across all calls to `paint()` and `sizeHint()`. This looked like:

```cpp
//...

void prepareWidget(QWidget* widget) {
  // The widget used for painting needs to be hidden or it'll show up twice
  // while painting it - once as the actual widget itself, and again as the
  // painted "image" of it. It needs to retain its size while hidden so that the
  // size calculations run correctly.
  auto sizePolicy = widget->sizePolicy();
  sizePolicy.setRetainSizeWhenHidden(true);
  widget->setSizePolicy(sizePolicy);
  widget->setHidden(true);
}

class Card : public QFrame {
public:
  Card(QWidget * parent): QFrame(parent) {
    //...
  }

  void setContent(const QModelIndex& index) {
    //...
  }

  //...
};

class CardDelegate : public QStyledItemDelegate {
  Q_OBJECT
public:
  CardDelegate(QListView* parent) : QStyledItemDelegate(parent) {
    //...
    // Create a card to share across all paints and size hint calculations.
    // I don't think it really matters what gets used as the parent, but the
    // parent that gets passed to createEditor() (which will become relevant
    // later) happens to be the viewport widget, so I use it here for
    // consistency.
    widget = new Card(parent->viewport());
    prepareWidget(widget);
  }

  void paint(QPainter* painter,
             const QStyleOptionViewItem& option,
             const QModelIndex& index) const override {
    //...

    painter->translate(styleOption.rect.topLeft());

    // The new bit: set the card's content without constructing a new card.
    widget->setContent(index);

    auto sizeHint = calculateSize(widget, styleOption);

    //...
  }

  QSize sizeHint(const QStyleOptionViewItem& option,
                 const QModelIndex& index) const override {
    if (!index.isValid()) {
      return QStyledItemDelegate::sizeHint(option, index);
    }

    auto styleOption = QStyleOptionViewItem(option);
    initStyleOption(&styleOption, index);

    // The new bit: set the card's content without constructing a new card.
    widget->setContent(index);

    return calculateSize(widget, styleOption);
  }

private:
  Card * widget;
};
```

Simply not constructing a new card every time meant that my idle CPU usage dropped back down to 0%. Anything that causes size hints to be recalculated for the whole list (like filtering or changing the width of the scrollable area) still caused a lot of lag though.

## Caching size hints

Calculating size hints is slow, and this mostly comes down to the fact that when a card's content is set, the layout needs to be recalculated and that is slow. Actually setting the content can also be a little slow, so I made some optimisations to avoid making UI changes unnecessarily (e.g. for a list of message `QLabel`s, don't delete and recreate them if the messages haven't changed, or don't bother setting a `QLabel`'s value if it is going to be hidden).

However, the layout recalculation was the dominating factor and it's one I couldn't do much about. Presumably using less complex layouts would speed this up, but I didn't look into that as it seemed like a lot of work for dubious benefit. Instead, given how frequently `QStyledItemDelegate::sizeHint()` runs even when nothing is happening, I decided to add some caching to avoid recalculating the layout unnecessarily.

There are two cases where a card size needs to be recalculated:

1. Something about the item's data has changed in a way that would affect the height of the card. The size hint is also technically dependent on the card's minimum width, but that's effectively static per item.
2. The width of the viewport has changed, potentially affecting the card's height.

The cache can therefore be a `std::map<SizeHintCacheKey, QSize>`, where `SizeHintCacheKey` is some type such that its value is dependent on all the data values that might affect the height of the card. I'm using a `SizeHintCacheKey` defined as:

```cpp
// The first three QStrings represent separate QLabel texts that can word wrap.
// The std::vector<std::string> represents another block of rich text messages
// that can also word wrap, in their raw format. The boolean indicates if
// there's a piece of fixed-height content present or not.
typedef std::tuple<QString, QString, QString, std::vector<std::string>, bool>
    SizeHintCacheKey;
```

I'm using a `std::tuple` rather than a struct with named fields (which would be more readable) because it means I can avoid having to define comparison operators myself.

> This isn't perfect, because two strings that are not identical can still take up the same amount of space when displayed, and so there are more cache entries than strictly necessary, but I think it's a good compromise between simplicity, speed and memory usage.
>
> You could use `QFontMetricsF::size()` or similar to measure the space the plain texts would take up and use those values in the cache key instead of the strings themselves, but in my testing that's a little slower and has very little impact on the number of cache entries.
>
> You couldn't do the same for the rich text strings, as you'd need to pretty much render them to measure their sizes, and then the cache key may not save much computation...

Using this as the cache key as opposed to something like the item's unique ID is good for two reasons:

* it directly ties the relevant factors to the cached value, avoiding some unnecessary cache misses when any data that doesn't affect the height (e.g. a fixed-width field value) has changed.
* it means that the same cached size hint can be used for multiple cards. This is less significant than it could be with a more precise cache key (see the inset block above), but even so there can be a lot of cards with empty text strings, and they'll all share a single cache key. With a data set of 410 items, I found that the size hint cache only contained 76 entries. If the cache key used the item's unique ID, memory usage would scale linearly with the number of items in the list, which I want to avoid.

So, I've got my cache key, and the code can now look like this:

```cpp
SizeHintCacheKey getSizeHintCacheKey(const QModelIndex& index) {
  //...
}

class CardDelegate : public QStyledItemDelegate {
  Q_OBJECT
public:
  //...

  QSize sizeHint(const QStyleOptionViewItem& option,
                 const QModelIndex& index) const override {
    if (!index.isValid()) {
      return QStyledItemDelegate::sizeHint(option, index);
    }

    auto styleOption = QStyleOptionViewItem(option);
    initStyleOption(&styleOption, index);

    // Cache size hints by SizeHintCacheKey because that contains all the data
    // that the card size could depend on, aside from the available width, and
    // so it means that different items with cards of the same size can share
    // cached size data.
    // It's a bit inefficient to do all the message and tag transformations here
    // and again when setting the actual card content (if that happens), but in
    // practice the cost is negligible.
    auto cacheKey = getSizeHintCacheKey(index);

    auto it = sizeHintCache.find(cacheKey);
    if (it != sizeHintCache.end()) {
      // Found a cached size, check if its width matches the current available
      // width.
      if (it->second.width() == styleOption.rect.width()) {
        // The cached size is valid, return it.
        return it->second;
      }
    }

    // Either no cached size hint was found or the size hint was for a different
    // width, recalculate it.

    widget->setContent(index);

    auto sizeHint = calculateSize(widget, styleOption);

    // Cache the new size hint.
    sizeHintCache.insert_or_assign(cacheKey, sizeHint);

    return sizeHint;
  }

private:
  //...
  mutable std::map<SizeHintCacheKey, QSize> sizeHintCache;
};
```

This results in a big improvement for responsiveness when filtering the list, but changing the list's width is still laggy. That's because the `Card::setContent()` call is still slow due to those layout recalculations.

However, we only need to set the content every time we recalculate because we're sharing the card between different items with different content. To put it another way, sharing the card means that the cost of constructing cards is constant with respect to the number of list items, but it means that the cost of calculating size hints is linear with the number of list items. What if we used a slightly different approach that gave non-constant but better-than-linear scaling on card construction *and* size hint calculation?

We've already established that the number of `SizeHintCacheKey` values is less than the size of the list in practice (and I've observed better-than-linear scaling across various list sizes), and if we cache cards by `SizeHintCacheKey` values we also benefit from the fact that if we get a cache hit we know the cached card has already got content set that gives the correct size, so we can avoid calling `setContent()`. Here's the code with that card caching added:

```cpp
//...

class CardDelegate : public QStyledItemDelegate {
  Q_OBJECT
public:
  //...

  QSize sizeHint(const QStyleOptionViewItem& option,
                 const QModelIndex& index) const override {
    //...

    auto cacheKey = getSizeHintCacheKey(index);

    auto it = sizeHintCache.find(cacheKey);
    if (it != sizeHintCache.end()) {
      // Found a cached size, check if its width matches the current available
      // width.
      if (it->second.second.width() == styleOption.rect.width()) {
        // The cached size is valid, return it.
        return it->second.second;
      }
    } else {
      // Create a widget for this cache key and set appropriate content.
      QWidget* parentWidget = qobject_cast<QListView*>(parent())->viewport();
      auto widget = new Card(parentWidget);
      widget->setContent(index);

      // It doesn't matter that the size is invalid, it'll get replaced before
      // this function returns.
      it = sizeHintCache.emplace(cacheKey, std::make_pair(widget, QSize())).first;
    }

    // If the card is new, it's already been initalised with the appopriate data
    // above. If the card is not new then it already has appropriate data and a
    // size just needs to be calculated for the current available width.
    auto sizeHint = calculateSize(it->second.first, styleOption);

    it->second.second = sizeHint;

    return sizeHint;
  }

private:
  //...
  mutable std::map<SizeHintCacheKey, std::pair<QWidget*, QSize>> sizeHintCache;
};
```

With that, the `paint()` and `sizeHint()` calls are finally fast enough to provide a smooth experience while using the UI. No doubt there's more that can be done, but I'm satisfied for now.

## Interactive item UI

There's one big problem with the approach above: none of the content displayed for the list items is interactive, beyond the operations you can perform on a list row as a whole. This is fairly obvious once you understand what `paint()` is doing: it's "painting" an image of the card onto your screen, not actually creating a card that you can interact with. In my use case, this is a problem because my requirements involve being able to see tooltips and click on links.

To get interactivity when using delegates, you need to create an "editor" widget. They're called "editors" because they're typically used to allow the data that is displayed by `paint()` to be edited (e.g. you double-click on a table cell to edit the number displayed in that cell). The editors are created by the delegate, like so:

```cpp
class CardDelegate : public QStyledItemDelegate {
  Q_OBJECT
public:
  //...

  QWidget* createEditor(QWidget* parent,
                        const QStyleOptionViewItem& option,
                        const QModelIndex& index) const override {
    if (!index.isValid()) {
      return nullptr;
    }

    return new Card(parent);
  }

  void setEditorData(QWidget* editor, const QModelIndex& index) const override {
    if (!index.isValid()) {
      return;
    }

    auto widget = qobject_cast<Card*>(editor);
    if (widget == nullptr) {
      // Probably a good idea to log an error here.
      return;
    }

    widget->setContent(index);
  }

  void setModelData(QWidget* editor,
                    QAbstractItemModel* model,
                    const QModelIndex& index) const override {
    // Do nothing, Card doesn't have any user inputs to record the values
    // of.
  }
};
```

Here we create an editor that is exactly the same type of widget as we're painting, with the same content. Note that `Card` needs to have a background colour set or else the editor will be transparent and you'll see the painted widget underneath it. In practice that means you get some visual glitches like text appearing heavier.

One of the nice things about editors is that while they're open they are automatically updated if the modex index's data changes. The trickier bit is deciding how and when to open and close them.

You can get an editor to open on one of a predefined set of edit triggers (e.g. double-clicking an item) or by calling `QAbstractItemView::edit()` for a particular index, but programmatically closing the editor requires you to have somehow recorded the relevant `editor` widget that you want to close. The alternative is to use *persistent* editors, for which there are symmetric open and close functions available. I don't know what (if any) is the difference compared to normal editors, other than the APIs available. It's easier to use persistent editors, even though I don't actually need persistence, so that's what I went with. The question then becomes one of when to call those functions.

My initial implementation of an interactive card list just opened a persistent editor for every index on rows being added to the model, and didn't bother implementing `paint()` at all. This suffers from the same kind of performance issues as the initial `sizeHint()` implementation had: if an editor takes 15 milliseconds to open and you have 400 editors to open, the UI is going to be unresponsive for a while. Memory usage would also be linear with the number of items in the list.

Because I'm is only interested in interactive list item UI for the sake of mouse interactions (hovering over icons for tooltips, and clicking on links), I only need the editor to be open while the user is hovering their pointer over a card. Do achieve this, I now connect `QAbstractItemView`'s `entered` signal to a slot that calls `QAbstractItemView::openPersistentEditor()`. This means that the list is initially rendered only using `paint()`, but when a user moves their mouse over a card, the item's editor is opened on top of the painted image. Because the editor looks the same as the image, this switch isn't visible to the user, but it means that the card's content is interactive without affecting the time it takes to initialise the list.

The slot function also records what the entered index is (as a `QPersistentModelIndex`) and calls `QAbstractItemView::closePersistentEditor()` on the previously-recorded index if it's not the same as the current signal's index. This means that there's only ever up to one editor open at a time, preventing memory usage from growing as more items are moused over.

The code looks like this:

```cpp
class MainWindow : public QMainWindow {
  Q_OBJECT
//...
private:
  //...
  QListView *listView;
  std::optional<QPersistentModelIndex> lastOpenedEditorIndex;

  void setupUi() {
    //...

    QMetaObject::connectSlotsByName(this);
  }

private slots:
  void on_listView_entered(const QModelIndex &index) {
    if (lastOpenedEditorIndex.has_value() &&
        lastOpenedEditorIndex.value().isValid() &&
        lastOpenedEditorIndex.value() != index) {
      // A different card already has its editor open, close that editor.
      listView->closePersistentEditor(lastOpenedEditorIndex.value());
    }

    if (!listView->isPersistentEditorOpen(index)) {
      // The card currently being hovered over doesn't have its editor opened,
      // open the editor.
      listView->openPersistentEditor(index);

      // Record this card as the last one that had its editor opened.
      lastOpenedEditorIndex = QPersistentModelIndex(index);
    }
  }
};
```

## Filtering rows

Like displaying custom widgets for list items, there seem to be two ways to only show a subset of rows in a `QListView`:

1. Use `QListView::setRowHidden()` to change what rows are visible.
2. Subclass `QSortFilterProxyModel` to use your item model as the source and set your view to use the proxy model.

The former is only available when using `QListView`, not any other subclass of `QAbstractItemView`, and means that if you have multiple views using the same model, you need to filter each one separately. Given those limitations, `QSortFilterProxyModel` is a better fit for my use case.

However, I did briefly encounter a significant drop in performance when I switched to bulk-opening persistent editors on model row insertion, and this lag wasn't present when I tried filtering using `QListView::setRowHidden()` instead. The problem was that while enabling a filter (and so removing items from view) was reasonably fast, disabling a filter (and so adding items back into view) caused the UI to hang for anywhere between less than a second to several seconds, depending on how many items were coming back into view.

This is because when `QSortFilterProxyModel` filters out a row, it gets removed from the proxy model, and when the row later gets filtered back in, it's inserted as if it's an entirely new row. If you've got a delegate that is slow to operate on new rows (e.g. because it need to construct a complex widget), it means all those operations suddenly need to run on each "new" row, whereas if the row is hidden in the list item, there's no new objects to construct or data to set and it's just a layout problem.

I've since solved the performance issue by opening editors on demand (as described above) and have gone back to using `SortFilterProxyModel`.

## Conclusion

That's it! This was all done in the context of LOOT's new Qt-based GUI, and though I've tried to stay generic when writing this article maybe that means there's some missing context or some typos snuck in to the example code. Fortunately, if the above isn't enough, you can also [read LOOT's source code](https://github.com/loot/loot/tree/6daa98c0e45eddb4d5b37312302592ab4cf476c8).
