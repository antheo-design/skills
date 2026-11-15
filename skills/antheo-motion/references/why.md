# Why each motion rule is the way it is

`SKILL.md` gives the values. This file gives the reasons, so a value that looks arbitrary can be defended, and a
case the rules don't cover can be decided the same way. Break a rule only when its reason doesn't apply, and say so.

## Motion is for understanding, not for show

Movement draws the eye harder than anything else on a screen: colour, size and position all lose to something that
moves. That is why it must earn its place. Good motion answers a question the person would otherwise have: where did
that come from, where did it go, did my press register, what changed. Motion that answers nothing still takes
attention, and spends it on nothing.

## The more often it is seen, the less it moves

The first time a menu grows from its button, it explains where the menu lives. The hundredth time, the explanation
is known and the animation is only a wait. People who use a tool all day feel 200ms on every keystroke as the tool
being slow, even when they can't say why. So frequency, not taste, sets the budget: what is seen constantly is
nearly instant, what is rare can take its time.

## Keyboard actions never animate

Someone using the keyboard is moving fast on purpose. When an arrow key moves a highlight, the highlight must be
there before the next key press, or the person loses their place. A trailing animation also lies about where focus
is for a moment.

## Under 300ms for interface motion

Around 100ms feels instant; around 300ms is where a transition starts to feel like waiting. Interface motion lives
under that line so it reads as the interface responding, not performing. Pages may take up to 400ms because they
carry the person to a new place, and losing their bearings costs more than the extra 100ms.

## Exits are quicker than entrances

When something appears, the person wants to see what it is, so its arrival is worth a moment. When it leaves, they
have already decided they are done with it; making them watch it go is making them wait for a decision they already
made. That is also why a close or a hover-out is never delayed.

## Ease-out for arriving and leaving

An ease-out starts fast and settles slowly. The fast start means the response begins the instant the person acts, so
it feels immediate; the slow end lets the eye land on where the thing came to rest. An ease-in does the opposite: it
starts slowly, which reads as lag at exactly the moment the person is waiting for a response. The one place ease-in
fits is something thrown away for good, which should accelerate off the screen like an object falling.

## One curve, a strong one

The browser's built-in `ease-out` is mild: its start is not much faster than its end, so motion feels mushy. A
steeper curve (`cubic-bezier(0.23, 1, 0.32, 1)`) puts most of the movement in the first third, which is what makes a
short duration still feel smooth. Using one curve everywhere also makes a product feel like one thing: people stop
noticing motion when it all behaves the same way.

## Small distances, never from zero

Nothing in the physical world appears from nothing. A popover that grows from `scale(0)` looks like it is being
inflated; one that starts at `0.97` and fades in looks like it was always there and just became visible. Short
travel (4 to 12px) gives direction without making the eye chase the element across the screen.

## Grow from the trigger

A menu that grows out of the button that opened it tells the person, without words, that the two are connected and
where the menu will go back to. A menu that grows from its own centre floats free of its cause.

## Only transform and opacity, by default

The browser can move and fade an element on the graphics card without recalculating the page. Animating width,
height, top or margin makes it recalculate the layout of everything around the element on every frame, which drops
frames on ordinary phones. That is why size changes use `grid-template-rows` or a transform, and a changing shadow
fades on a pseudo-element.

## Transitions for state, keyframes for one-shot

A person can change their mind halfway through: open a menu and immediately close it. A transition reverses from
wherever it is. A keyframe animation plays its whole timeline, so a reversed state has to wait for it or jumps. Only
things that can't be interrupted (a check drawing once, a celebration) use keyframes.

## Stagger briefly, and never block

A short stagger lets the eye read a list as a sequence instead of a flash. Past about 300ms in total, the last
items arrive after the person has already started reading or clicking, and the motion is in the way. Items must be
clickable while they arrive.

## Springs only where a hand moves it

A spring carries the speed it was given. After a drag, that speed comes from the person's hand, so the thing keeps
moving the way they threw it, and that feels physical. On something that wasn't moved by hand, a spring's overshoot
is decoration: a bounce nobody asked for.

## Reduced motion means less movement, not less feedback

People who turn on reduced motion get dizzy or distracted by things sliding and zooming, not by things changing. So
travel, scale and blur become a short fade, and every state change is still shown. Removing the feedback entirely
leaves them guessing whether something happened.

## One signature moment at most

A moment is memorable because nothing else around it moves like that. Two of them compete, and five turn the
product into a show. That is why the rare, meaningful event gets it (antheo-moment), and everything else stays calm.
